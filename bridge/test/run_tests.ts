import { execSync } from 'child_process';

console.log('>>> RUNNING SUITE 1: COMP-3 & COPYBOOKCODEC UNIT TESTS <<<');
execSync('npx tsx test/comp3_roundtrip.test.ts', { stdio: 'inherit' });

console.log('\n>>> RUNNING SUITE 2: END-TO-END COBOL & SOLANA TESTS <<<');
execSync('npx tsx test/end_to_end.test.ts', { stdio: 'inherit' });

console.log('\n>>> ALL BRIDGE TESTS COMPLETED SUCCESSFULLY! <<<');
