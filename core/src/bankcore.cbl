       IDENTIFICATION DIVISION.
       PROGRAM-ID. BANKCORE.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT ACCT-FILE ASSIGN TO "data/ACCTS.DAT"
           ORGANIZATION IS INDEXED
           ACCESS MODE IS DYNAMIC
           RECORD KEY IS ACCT-ID
           FILE STATUS IS WS-FS.
       DATA DIVISION.
       FILE SECTION.
       FD  ACCT-FILE.
       01  ACCT-RECORD.
           05 ACCT-ID             PIC X(10).
           05 ACCT-BALANCE        PIC S9(9)V99 COMP-3.
           05 ACCT-STATUS         PIC X(01).
           05 ACCT-OWNER-NAME     PIC X(30).
       WORKING-STORAGE SECTION.
       01  WS-FS                  PIC XX VALUE "00".
       LINKAGE SECTION.
       COPY "transrec.cpy".
       PROCEDURE DIVISION USING TRANS-COMM-AREA.
       MAIN-PROCEDURE.
           PERFORM OPEN-FILES
           
           INITIALIZE RESP-HEADER
           INITIALIZE RESP-ACCT-DATA
           
           EVALUATE REQ-ACTION
               WHEN "CREATE"
                   PERFORM HANDLE-CREATE
               WHEN "READ  "
                   PERFORM HANDLE-READ
               WHEN "DEBIT "
                   PERFORM HANDLE-DEBIT
               WHEN "CREDIT"
                   PERFORM HANDLE-CREDIT
               WHEN "SETSTS"
                   PERFORM HANDLE-STATUS
               WHEN OTHER
                   MOVE "05" TO RESP-RETURN-CODE
                   MOVE "INVALID ACTION REQUESTED" TO RESP-MESSAGE
           END-EVALUATE
           
           PERFORM CLOSE-FILES
           GOBACK.

       OPEN-FILES.
           OPEN I-O ACCT-FILE
           IF WS-FS = "35"
               OPEN OUTPUT ACCT-FILE
               CLOSE ACCT-FILE
               OPEN I-O ACCT-FILE
           END-IF.

       CLOSE-FILES.
           IF WS-FS NOT = "35"
               CLOSE ACCT-FILE
           END-IF.

       HANDLE-CREATE.
           MOVE REQ-ACCT-ID TO ACCT-ID
           READ ACCT-FILE KEY IS ACCT-ID
           IF WS-FS = "00"
               MOVE "04" TO RESP-RETURN-CODE
               MOVE "ACCOUNT ALREADY EXISTS" TO RESP-MESSAGE
               PERFORM POPULATE-RESPONSE
           ELSE
               MOVE REQ-ACCT-ID TO ACCT-ID
               MOVE REQ-AMOUNT TO ACCT-BALANCE
               IF REQ-NEW-STATUS = SPACE
                   MOVE "A" TO ACCT-STATUS
               ELSE
                   MOVE REQ-NEW-STATUS TO ACCT-STATUS
               END-IF
               MOVE REQ-OWNER-NAME TO ACCT-OWNER-NAME
               WRITE ACCT-RECORD
               IF WS-FS = "00"
                   MOVE "00" TO RESP-RETURN-CODE
                   MOVE "ACCOUNT CREATED SUCCESSFULLY" TO RESP-MESSAGE
                   PERFORM POPULATE-RESPONSE
               ELSE
                   MOVE "99" TO RESP-RETURN-CODE
                   STRING "WRITE FAILED FS=" WS-FS INTO RESP-MESSAGE
               END-IF
           END-IF.

       HANDLE-READ.
           MOVE REQ-ACCT-ID TO ACCT-ID
           READ ACCT-FILE KEY IS ACCT-ID
           IF WS-FS = "00"
               MOVE "00" TO RESP-RETURN-CODE
               MOVE "ACCOUNT RETRIEVED SUCCESSFULLY" TO RESP-MESSAGE
               PERFORM POPULATE-RESPONSE
           ELSE
               MOVE "01" TO RESP-RETURN-CODE
               MOVE "ACCOUNT NOT FOUND" TO RESP-MESSAGE
           END-IF.

       HANDLE-DEBIT.
           MOVE REQ-ACCT-ID TO ACCT-ID
           READ ACCT-FILE KEY IS ACCT-ID
           IF WS-FS NOT = "00"
               MOVE "01" TO RESP-RETURN-CODE
               MOVE "ACCOUNT NOT FOUND" TO RESP-MESSAGE
           ELSE
               IF ACCT-STATUS NOT = "A"
                   MOVE "03" TO RESP-RETURN-CODE
                   MOVE "ACCOUNT IS NOT ACTIVE" TO RESP-MESSAGE
                   PERFORM POPULATE-RESPONSE
               ELSE
                   IF ACCT-BALANCE < REQ-AMOUNT
                       MOVE "02" TO RESP-RETURN-CODE
                       MOVE "INSUFFICIENT FUNDS" TO RESP-MESSAGE
                       PERFORM POPULATE-RESPONSE
                   ELSE
                       SUBTRACT REQ-AMOUNT FROM ACCT-BALANCE
                       REWRITE ACCT-RECORD
                       IF WS-FS = "00"
                           MOVE "00" TO RESP-RETURN-CODE
                           MOVE "DEBIT SUCCESSFUL" TO RESP-MESSAGE
                           PERFORM POPULATE-RESPONSE
                       ELSE
                           MOVE "99" TO RESP-RETURN-CODE
                           STRING "REWRITE FAILED FS=" WS-FS 
                               INTO RESP-MESSAGE
                       END-IF
                   END-IF
               END-IF
           END-IF.

       HANDLE-CREDIT.
           MOVE REQ-ACCT-ID TO ACCT-ID
           READ ACCT-FILE KEY IS ACCT-ID
           IF WS-FS NOT = "00"
               MOVE "01" TO RESP-RETURN-CODE
               MOVE "ACCOUNT NOT FOUND" TO RESP-MESSAGE
           ELSE
               IF ACCT-STATUS NOT = "A"
                   MOVE "03" TO RESP-RETURN-CODE
                   MOVE "ACCOUNT IS NOT ACTIVE" TO RESP-MESSAGE
                   PERFORM POPULATE-RESPONSE
               ELSE
                   ADD REQ-AMOUNT TO ACCT-BALANCE
                   REWRITE ACCT-RECORD
                   IF WS-FS = "00"
                       MOVE "00" TO RESP-RETURN-CODE
                       MOVE "CREDIT SUCCESSFUL" TO RESP-MESSAGE
                       PERFORM POPULATE-RESPONSE
                   ELSE
                       MOVE "99" TO RESP-RETURN-CODE
                       STRING "REWRITE FAILED FS=" WS-FS 
                           INTO RESP-MESSAGE
                   END-IF
               END-IF
           END-IF.

       HANDLE-STATUS.
           MOVE REQ-ACCT-ID TO ACCT-ID
           READ ACCT-FILE KEY IS ACCT-ID
           IF WS-FS NOT = "00"
               MOVE "01" TO RESP-RETURN-CODE
               MOVE "ACCOUNT NOT FOUND" TO RESP-MESSAGE
           ELSE
               MOVE REQ-NEW-STATUS TO ACCT-STATUS
               REWRITE ACCT-RECORD
               IF WS-FS = "00"
                   MOVE "00" TO RESP-RETURN-CODE
                   MOVE "STATUS UPDATED SUCCESSFULLY" TO RESP-MESSAGE
                   PERFORM POPULATE-RESPONSE
               ELSE
                   MOVE "99" TO RESP-RETURN-CODE
                   STRING "UPDATE STATUS FAILED FS=" WS-FS 
                       INTO RESP-MESSAGE
               END-IF
           END-IF.

       POPULATE-RESPONSE.
           MOVE ACCT-ID TO RESP-ACCT-ID
           MOVE ACCT-BALANCE TO RESP-ACCT-BALANCE
           MOVE ACCT-STATUS TO RESP-ACCT-STATUS
           MOVE ACCT-OWNER-NAME TO RESP-ACCT-OWNER.
