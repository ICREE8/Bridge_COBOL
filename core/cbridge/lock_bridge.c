#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <sys/time.h>
#include <pthread.h>
#include <libcob.h>

#define COMM_AREA_SIZE 183
#define LOCK_SLOT_SIZE 64
#define MAX_SLOTS 65536
#define DEFAULT_SOCKET_PATH "/tmp/bankcore.sock"
#define DEFAULT_LOCK_FILE "data/accts.lock"

#pragma pack(push, 1)
typedef struct {
    char action[6];                 // 0..5
    char acct_id[10];               // 6..15
    uint8_t amount[6];              // 16..21
    char new_status[1];             // 22..22
    char owner_name[30];            // 23..52
    char idempotency_key[36];       // 53..88
    char return_code[2];            // 89..90
    char message[45];               // 91..135
    char resp_acct_id[10];          // 136..145
    uint8_t resp_balance[6];        // 146..151
    char resp_status[1];            // 152..152
    char resp_owner[30];            // 153..182
} TransCommArea;
#pragma pack(pop)

extern void BANKCORE(void *comm_area);

static int lock_fd = -1;

static uint32_t hash_acct_id(const char *acct_id, size_t len) {
    uint32_t hash = 2166136261u;
    for (size_t i = 0; i < len; i++) {
        hash ^= (uint8_t)acct_id[i];
        hash *= 16777619u;
    }
    return hash % MAX_SLOTS;
}

static off_t get_lock_offset(const char *acct_id) {
    uint32_t slot = hash_acct_id(acct_id, 10);
    return (off_t)slot * LOCK_SLOT_SIZE;
}

int acquire_record_lock(const char *acct_id, int wait_block) {
    off_t offset = get_lock_offset(acct_id);
    struct flock fl;
    memset(&fl, 0, sizeof(fl));
    fl.l_type = F_WRLCK;
    fl.l_whence = SEEK_SET;
    fl.l_start = offset;
    fl.l_len = LOCK_SLOT_SIZE;

    int cmd = wait_block ? F_SETLKW : F_SETLK;
    int res = fcntl(lock_fd, cmd, &fl);
    if (res < 0) {
        if (errno == EACCES || errno == EAGAIN) {
            return 1;
        }
        perror("fcntl lock error");
        return -1;
    }
    return 0;
}

int release_record_lock(const char *acct_id) {
    off_t offset = get_lock_offset(acct_id);
    struct flock fl;
    memset(&fl, 0, sizeof(fl));
    fl.l_type = F_UNLCK;
    fl.l_whence = SEEK_SET;
    fl.l_start = offset;
    fl.l_len = LOCK_SLOT_SIZE;

    if (fcntl(lock_fd, F_SETLK, &fl) < 0) {
        perror("fcntl unlock error");
        return -1;
    }
    return 0;
}

void encode_comp3(long long amount_cents, uint8_t *out_comp3) {
    long long abs_amt = (amount_cents < 0) ? -amount_cents : amount_cents;
    char digits[32];
    snprintf(digits, sizeof(digits), "%011lld", abs_amt);

    uint8_t sign = (amount_cents < 0) ? 0x0D : 0x0C;
    out_comp3[0] = ((digits[0] - '0') << 4) | (digits[1] - '0');
    out_comp3[1] = ((digits[2] - '0') << 4) | (digits[3] - '0');
    out_comp3[2] = ((digits[4] - '0') << 4) | (digits[5] - '0');
    out_comp3[3] = ((digits[6] - '0') << 4) | (digits[7] - '0');
    out_comp3[4] = ((digits[8] - '0') << 4) | (digits[9] - '0');
    out_comp3[5] = ((digits[10] - '0') << 4) | sign;
}

long long decode_comp3(const uint8_t *in_comp3) {
    long long val = 0;
    for (int i = 0; i < 5; i++) {
        val = val * 10 + ((in_comp3[i] >> 4) & 0x0F);
        val = val * 10 + (in_comp3[i] & 0x0F);
    }
    val = val * 10 + ((in_comp3[5] >> 4) & 0x0F);
    uint8_t sign = in_comp3[5] & 0x0F;
    if (sign == 0x0D) {
        val = -val;
    }
    return val;
}

void process_transaction(TransCommArea *ca, int simulate_delay_ms) {
    char action[7] = {0};
    char acct_id[11] = {0};
    memcpy(action, ca->action, 6);
    memcpy(acct_id, ca->acct_id, 10);

    for (int i = 5; i >= 0 && action[i] == ' '; i--) action[i] = '\0';
    for (int i = 9; i >= 0 && acct_id[i] == ' '; i--) acct_id[i] = '\0';

    struct timeval t0, t1;
    gettimeofday(&t0, NULL);

    fprintf(stdout, "[CORE-LOCK] Request pid=%d action=%s acct=%s: Acquiring fcntl lock...\n", 
            getpid(), action, acct_id);
    fflush(stdout);

    if (acquire_record_lock(acct_id, 1) != 0) {
        fprintf(stderr, "[CORE-LOCK] Failed to acquire lock for %s\n", acct_id);
        memcpy(ca->return_code, "99", 2);
        return;
    }

    gettimeofday(&t1, NULL);
    long lock_wait_us = (t1.tv_sec - t0.tv_sec) * 1000000L + (t1.tv_usec - t0.tv_usec);
    fprintf(stdout, "[CORE-LOCK] Lock ACQUIRED for %s (waited %ld us). Invoking BANKCORE...\n", 
            acct_id, lock_wait_us);
    fflush(stdout);

    BANKCORE(ca);

    if (simulate_delay_ms > 0) {
        usleep(simulate_delay_ms * 1000);
    }

    release_record_lock(acct_id);
    fprintf(stdout, "[CORE-LOCK] Lock RELEASED for %s. RC=%.2s MSG=%.45s\n", 
            acct_id, ca->return_code, ca->message);
    fflush(stdout);
}

int run_cli(int argc, char **argv) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s <ACTION> <ACCT-ID> [AMOUNT_CENTS] [STATUS] [OWNER] [DELAY_MS]\n", argv[0]);
        return 1;
    }

    TransCommArea ca;
    memset(&ca, ' ', sizeof(ca));

    const char *action = argv[1];
    const char *acct_id = argv[2];
    long long amount_cents = (argc > 3) ? atoll(argv[3]) : 0;
    const char *status = (argc > 4) ? argv[4] : "A";
    const char *owner = (argc > 5) ? argv[5] : "Demo Customer";
    int delay_ms = (argc > 6) ? atoi(argv[6]) : 0;

    memcpy(ca.action, action, strlen(action) > 6 ? 6 : strlen(action));
    memcpy(ca.acct_id, acct_id, strlen(acct_id) > 10 ? 10 : strlen(acct_id));
    encode_comp3(amount_cents, ca.amount);
    ca.new_status[0] = status[0];
    memcpy(ca.owner_name, owner, strlen(owner) > 30 ? 30 : strlen(owner));
    memcpy(ca.idempotency_key, "CLI-TEST-IDEMPOTENCY-KEY-0000000001", 35);

    process_transaction(&ca, delay_ms);

    char rc[3] = {ca.return_code[0], ca.return_code[1], '\0'};
    char msg[46] = {0};
    memcpy(msg, ca.message, 45);
    char out_acct[11] = {0};
    memcpy(out_acct, ca.resp_acct_id, 10);
    char out_owner[31] = {0};
    memcpy(out_owner, ca.resp_owner, 30);

    long long bal = decode_comp3(ca.resp_balance);

    printf("\n=== BANKCORE CLI RESPONSE ===\n");
    printf("Return Code   : %s\n", rc);
    printf("Message       : %s\n", msg);
    printf("Account ID    : %s\n", out_acct);
    printf("Balance ($)   : %lld.%02lld\n", bal / 100, (bal >= 0 ? bal : -bal) % 100);
    printf("Balance Bytes : 0x%02X 0x%02X 0x%02X 0x%02X 0x%02X 0x%02X\n",
           ca.resp_balance[0], ca.resp_balance[1], ca.resp_balance[2],
           ca.resp_balance[3], ca.resp_balance[4], ca.resp_balance[5]);
    printf("Status        : %c\n", ca.resp_status[0]);
    printf("Owner         : %s\n", out_owner);
    printf("=============================\n");

    return (strcmp(rc, "00") == 0) ? 0 : 1;
}

int run_server(const char *sock_path, int tcp_port) {
    int unix_fd = -1;
    if (sock_path && strlen(sock_path) > 0) {
        unlink(sock_path);
        unix_fd = socket(AF_UNIX, SOCK_STREAM, 0);
        if (unix_fd >= 0) {
            struct sockaddr_un un_addr;
            memset(&un_addr, 0, sizeof(un_addr));
            un_addr.sun_family = AF_UNIX;
            strncpy(un_addr.sun_path, sock_path, sizeof(un_addr.sun_path) - 1);
            if (bind(unix_fd, (struct sockaddr*)&un_addr, sizeof(un_addr)) == 0) {
                listen(unix_fd, 64);
                printf("[BANKCORE-SERVER] Listening on Unix Socket: %s\n", sock_path);
            } else {
                perror("Unix socket bind failed (continuing with TCP)");
                close(unix_fd);
                unix_fd = -1;
            }
        }
    }

    int tcp_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (tcp_fd < 0) {
        perror("socket AF_INET");
        return 1;
    }

    int opt = 1;
    setsockopt(tcp_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in in_addr;
    memset(&in_addr, 0, sizeof(in_addr));
    in_addr.sin_family = AF_INET;
    in_addr.sin_addr.s_addr = INADDR_ANY;
    in_addr.sin_port = htons(tcp_port);

    if (bind(tcp_fd, (struct sockaddr*)&in_addr, sizeof(in_addr)) < 0) {
        perror("bind AF_INET failed");
        return 1;
    }
    listen(tcp_fd, 64);
    printf("[BANKCORE-SERVER] Listening on TCP Port   : %d\n", tcp_port);
    fflush(stdout);

    int max_fd = (unix_fd > tcp_fd ? unix_fd : tcp_fd);

    while (1) {
        fd_set read_fds;
        FD_ZERO(&read_fds);
        if (unix_fd >= 0) FD_SET(unix_fd, &read_fds);
        FD_SET(tcp_fd, &read_fds);

        int activity = select(max_fd + 1, &read_fds, NULL, NULL, NULL);
        if (activity < 0 && errno != EINTR) {
            perror("select");
            break;
        }

        int client_fd = -1;
        if (unix_fd >= 0 && FD_ISSET(unix_fd, &read_fds)) {
            client_fd = accept(unix_fd, NULL, NULL);
        } else if (FD_ISSET(tcp_fd, &read_fds)) {
            client_fd = accept(tcp_fd, NULL, NULL);
        }

        if (client_fd < 0) continue;

        TransCommArea ca;
        ssize_t total_read = 0;
        uint8_t *ptr = (uint8_t*)&ca;
        while (total_read < sizeof(ca)) {
            ssize_t n = read(client_fd, ptr + total_read, sizeof(ca) - total_read);
            if (n <= 0) break;
            total_read += n;
        }

        if (total_read == sizeof(ca)) {
            process_transaction(&ca, 0);
            ssize_t total_written = 0;
            while (total_written < sizeof(ca)) {
                ssize_t n = write(client_fd, ptr + total_written, sizeof(ca) - total_written);
                if (n <= 0) break;
                total_written += n;
            }
        }
        close(client_fd);
    }

    if (unix_fd >= 0) close(unix_fd);
    close(tcp_fd);
    return 0;
}

int main(int argc, char **argv) {
    if (sizeof(TransCommArea) != COMM_AREA_SIZE) {
        fprintf(stderr, "STRUCT MISMATCH: expected %d, got %lu\n", COMM_AREA_SIZE, sizeof(TransCommArea));
        return 1;
    }

    cob_init(0, NULL);

    mkdir("data", 0755);
    lock_fd = open(DEFAULT_LOCK_FILE, O_RDWR | O_CREAT, 0666);
    if (lock_fd < 0) {
        perror("Failed to open lock file");
        return 1;
    }

    if (argc >= 2 && strcmp(argv[1], "server") == 0) {
        const char *sock = (argc > 2) ? argv[2] : DEFAULT_SOCKET_PATH;
        int port = (argc > 3) ? atoi(argv[3]) : 9999;
        return run_server(sock, port);
    }

    return run_cli(argc, argv);
}
