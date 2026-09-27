      *****************************************************************
      * TRANSREC.CPY - CICS COMMAREA / IPC TRANSACTION BUFFER
      * EXACT FIXED-WIDTH BUFFER: 183 BYTES
      *****************************************************************
       01  TRANS-COMM-AREA.
           05 REQ-HEADER.
              10 REQ-ACTION           PIC X(06).
                 88 ACT-CREATE        VALUE "CREATE".
                 88 ACT-READ          VALUE "READ  ".
                 88 ACT-DEBIT         VALUE "DEBIT ".
                 88 ACT-CREDIT        VALUE "CREDIT".
                 88 ACT-STATUS        VALUE "SETSTS".
                 88 ACT-LIST          VALUE "LIST  ".
              10 REQ-ACCT-ID          PIC X(10).
              10 REQ-AMOUNT           PIC S9(9)V99 COMP-3.
              10 REQ-NEW-STATUS       PIC X(01).
              10 REQ-OWNER-NAME       PIC X(30).
              10 REQ-IDEMPOTENCY-KEY  PIC X(36).
           05 RESP-HEADER.
              10 RESP-RETURN-CODE     PIC X(02).
                 88 RET-SUCCESS       VALUE "00".
                 88 RET-NOT-FOUND     VALUE "01".
                 88 RET-INSUFFICIENT  VALUE "02".
                 88 RET-FROZEN        VALUE "03".
                 88 RET-DUPLICATE     VALUE "04".
                 88 RET-INVALID-CMD   VALUE "05".
                 88 RET-SYSTEM-ERROR  VALUE "99".
              10 RESP-MESSAGE         PIC X(45).
           05 RESP-ACCT-DATA.
              10 RESP-ACCT-ID         PIC X(10).
              10 RESP-ACCT-BALANCE    PIC S9(9)V99 COMP-3.
              10 RESP-ACCT-STATUS     PIC X(01).
              10 RESP-ACCT-OWNER      PIC X(30).
