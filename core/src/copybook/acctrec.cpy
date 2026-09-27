      *****************************************************************
      * ACCTREC.CPY - CICS / VSAM KSDS ACCOUNT MASTER RECORD LAYOUT
      * FIXED-WIDTH RECORD: EXACTLY 47 BYTES
      * 05 ACCT-ID             PIC X(10)           [OFFSET   0, LEN 10]
      * 05 ACCT-BALANCE        PIC S9(9)V99 COMP-3 [OFFSET  10, LEN  6]
      * 05 ACCT-STATUS         PIC X(01)           [OFFSET  16, LEN  1]
      * 05 ACCT-OWNER-NAME     PIC X(30)           [OFFSET  17, LEN 30]
      *****************************************************************
       01  ACCT-RECORD.
           05 ACCT-ID             PIC X(10).
           05 ACCT-BALANCE        PIC S9(9)V99 COMP-3.
           05 ACCT-STATUS         PIC X(01).
           05 ACCT-OWNER-NAME     PIC X(30).
