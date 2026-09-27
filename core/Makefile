CC = gcc
COBC = cobc
CFLAGS = -Wall -O2 -I/usr/include -Isrc/copybook
COBFLAGS = -Isrc/copybook
LIBS = -lcob -lpthread

all: bin/bankcore_cli

bin/bankcore_cli: src/bankcore.o cbridge/lock_bridge.c
	mkdir -p bin data
	$(CC) $(CFLAGS) cbridge/lock_bridge.c src/bankcore.o -o bin/bankcore_cli $(LIBS)

src/bankcore.o: src/bankcore.cbl src/copybook/acctrec.cpy src/copybook/transrec.cpy
	$(COBC) -c $(COBFLAGS) -o src/bankcore.o src/bankcore.cbl

clean:
	rm -f src/bankcore.o bin/bankcore_cli data/accts.lock
