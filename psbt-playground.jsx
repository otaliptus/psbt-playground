import { useState, useEffect, useCallback, useMemo } from "react";
import PSBTBuilderGame from "./psbt-builder-game.jsx";

const C = {
  bg:"#06090f",surface:"#0d1219",card:"#111923",cardHi:"#151f2d",
  border:"#1e2d42",borderHi:"#f59e0b",
  text:"#dfe8f4",soft:"#96a7bf",dim:"#576980",
  amber:"#f59e0b",green:"#22c55e",red:"#ef4444",blue:"#3b82f6",
  purple:"#a78bfa",cyan:"#06b6d4",orange:"#fb923c",teal:"#14b8a6",
};

const PSBT_EXAMPLES = [
  {id:"v0-creator",label:"v0: Creator Output",cat:"v0",desc:"BIP-174 test vector: unsigned tx, 2 inputs (P2SH-P2WPKH + P2SH-P2WSH), 2 P2WPKH outputs. No metadata yet.",
    hex:"70736274ff01009a020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c8757924f545887bb2abdd750000000000ffffffff838d0427d0ec650a68aa46bb0b098aea4422c071b2ca78352a077959d07cea1d0100000000ffffffff0270aaf00800000000160014d85c2b71d0060b09c9886aeb815e50991dda124d00e1f5050000000016001400aea9a2e5f0f876a588df5546e8742d1d87008f000000000000000000",
    roles:{"Global Map":"Creator: UNSIGNED_TX with 2 inputs, 2 outputs, all scriptSigs empty","Input 0 Map":"Empty — Updater has not added UTXO data yet","Input 1 Map":"Empty — no metadata","Output 0 Map":"Empty","Output 1 Map":"Empty"},
    utxos:[{label:"Input 0",txid:"75ddabb2...7ae858",vout:0,amount:"0.50 BTC",type:"P2SH-P2WPKH",status:"Unsigned"},{label:"Input 1",txid:"1dea7cd0...048d83",vout:1,amount:"6.25 BTC",type:"P2SH-P2WSH",status:"Unsigned"}],
    outputs:[{label:"Output 0",addr:"tb1qmpwzkuw...",amount:"1.4999 BTC",type:"P2WPKH"},{label:"Output 1",addr:"tb1qqzh2ngh...",amount:"1.0000 BTC",type:"P2WPKH"}]},
  {id:"v0-updated",label:"v0: After Updater",cat:"v0",desc:"BIP-174: Updater added NON_WITNESS_UTXO, WITNESS_UTXO, redeemScripts, witnessScripts, sighash types, and BIP32 derivation paths.",
    hex:"70736274ff01009a020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c8757924f545887bb2abdd750000000000ffffffff838d0427d0ec650a68aa46bb0b098aea4422c071b2ca78352a077959d07cea1d0100000000ffffffff0270aaf00800000000160014d85c2b71d0060b09c9886aeb815e50991dda124d00e1f5050000000016001400aea9a2e5f0f876a588df5546e8742d1d87008f00000000000100bb0200000001aad73931018bd25f84ae400b68848be09db706eac2ac18298babee71ab656f8b0000000048473044022058f6fc7c6a33e1b31548d481c826c015bd30135aad42cd67790dab66d2ad243b02204a1ced2604c6735b6393e5b41691dd78b00f0c5942fb9f751856faa938157dba01feffffff0280f0fa020000000017a9140fb9463421696b82c833af241c78c17ddbde493487d0f20a270100000017a91429ca74f8a08f81999428185c97b5d852e4063f6187650000000103040100000001044730440220cfef53a5f6f0a39da96b98b1d44b0e3d90c33c832bb3f5e7ae86ff8e26dae1fb0220018c2353173743b595dfb4a07b72ba8e42e3797da74e87fe7d9d7497e3b2028901220202dab61ff49a14db6a7d02b0cd1fbb78fc4b18312b5b4e54dae4dba2fbfef536d710d90c6a4f00000080000000800100008000",
    roles:{"Global Map":"Creator: UNSIGNED_TX (same as before)","Input 0 Map":"Updater: NON_WITNESS_UTXO (full prev tx, 187B) + SIGHASH_TYPE + REDEEM_SCRIPT + BIP32_DERIVATION","Input 1 Map":"Updater: WITNESS_UTXO + SIGHASH + REDEEM + WITNESS_SCRIPT + BIP32","Output 0 Map":"Updater: BIP32_DERIVATION for change identification","Output 1 Map":"Empty"},
    utxos:[{label:"Input 0",txid:"75ddabb2...7ae858",vout:0,amount:"0.50 BTC",type:"P2SH-P2WPKH",status:"Updated ◐"},{label:"Input 1",txid:"1dea7cd0...048d83",vout:1,amount:"1.00 BTC",type:"P2SH-P2WSH",status:"Updated ◐"}],
    outputs:[{label:"Output 0",addr:"tb1qmpwzkuw...",amount:"1.4999 BTC",type:"P2WPKH"},{label:"Output 1",addr:"tb1qqzh2ngh...",amount:"1.0000 BTC",type:"P2WPKH"}]},
  {id:"v0-minimal",label:"v0: Minimal 1-in 1-out",cat:"v0",desc:"Simplest possible v0 PSBT: one P2PKH input, one P2PKH output. Just the bare unsigned tx skeleton.",
    hex:"70736274ff0100550200000001eb63366191dbaf74d30c6de8cbb7208de3fb65ad266b41c56990a5a7e6a2eac90000000000ffffffff010017a804000000001976a914c1752bf5bffbd320ab2ab625b32b9fe48337dce488ac00000000000000",
    roles:{"Global Map":"Creator: unsigned tx (1 input, 1 P2PKH output)","Input 0 Map":"Empty — no UTXO data","Output 0 Map":"Empty"},
    utxos:[{label:"Input 0",txid:"eb633661...e6a2eac9",vout:0,amount:"Unknown",type:"Unknown",status:"No data"}],
    outputs:[{label:"Output 0",addr:"1JnXhQ...(P2PKH)",amount:"0.78 BTC",type:"P2PKH"}]},
  {id:"v0-empty",label:"v0: Empty (0-in 0-out)",cat:"v0",desc:"Minimum valid PSBT: magic + unsigned tx with 0 inputs, 0 outputs.",
    hex:"70736274ff01000a0200000000000000000000",
    roles:{"Global Map":"Creator: empty transaction (version 2, 0 inputs, 0 outputs, locktime 0)"},
    utxos:[],outputs:[]},
  {id:"v2-shell",label:"v2: Empty CoinJoin Shell",cat:"v2",desc:"PSBT v2 empty shell for CoinJoin start. VERSION=2, TX_VERSION=2, INPUT_COUNT=0, OUTPUT_COUNT=0, TX_MODIFIABLE=0x03. No UNSIGNED_TX — that’s the key v2 difference.",
    hex:"70736274ff01020200000001020200000001040001050001060103000000",
    roles:{"Global Map":"Creator: VERSION=2, TX_VERSION=2, INPUT_COUNT=0, OUTPUT_COUNT=0, TX_MODIFIABLE=0x03 (inputs+outputs modifiable)"},
    utxos:[],outputs:[]},
  {id:"v2-1in1out",label:"v2: Simple 1-in 1-out",cat:"v2",desc:"v2 PSBT with 1 input, 1 output. Tx data decomposed: PREVIOUS_TXID + OUTPUT_INDEX per input, AMOUNT + SCRIPT per output. Compare with ‘v0: Minimal’ to see structural differences.",
    hex:"70736274ff0102020000000102020000000104010105010001060100000e207b1eabe0209b1fe794124575ef807057c77ada2138ae4fa8d6c4de0398a14f3f010f040000000000030008e80300000000000004160014d85c2b71d0060b09c9886aeb815e50991dda124d00",
    roles:{"Global Map":"Creator: VERSION=2, TX_VERSION=2, 1 input, 1 output, TX_MODIFIABLE=0x00","Input 0 Map":"Creator: PREVIOUS_TXID + OUTPUT_INDEX (replaces unsigned tx)","Output 0 Map":"Creator: AMOUNT (1000 sats) + SCRIPT (P2WPKH)"},
    utxos:[{label:"Input 0",txid:"7b1eabe0...a14f3f",vout:0,amount:"Unknown",type:"(needs Updater)",status:"Created"}],
    outputs:[{label:"Output 0",addr:"bc1qmpwzk...",amount:"1,000 sats",type:"P2WPKH"}]},
  {id:"v2-modifiable",label:"v2: Mid-CoinJoin (modifiable)",cat:"v2",desc:"v2 mid-construction: 2 inputs from 2 participants, 2 equal outputs. TX_MODIFIABLE=0x03 — still accepting participants. Shows the Constructor role.",
    hex:"70736274ff0102020000000102020000000104020105020001060103000e20aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111010f0400000000000e20bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222010f04010000000003000884850100000000000004160014aaaa1111aaaa1111aaaa1111aaaa1111aaaa11110003000884850100000000000004160014bbbb2222bbbb2222bbbb2222bbbb2222bbbb222200",
    roles:{"Global Map":"Creator+Constructor: VERSION=2, TX_VERSION=2, 2 inputs, 2 outputs, TX_MODIFIABLE=0x03","Input 0 Map":"Constructor A: PREVIOUS_TXID + OUTPUT_INDEX","Input 1 Map":"Constructor B: PREVIOUS_TXID + OUTPUT_INDEX","Output 0 Map":"Constructor A: AMOUNT (99,700 sats) + SCRIPT","Output 1 Map":"Constructor B: AMOUNT (99,700 sats) + SCRIPT"},
    utxos:[{label:"Input 0 (A)",txid:"aaaa1111...",vout:0,amount:"100,000 sats",type:"P2WPKH",status:"Constructed"},{label:"Input 1 (B)",txid:"bbbb2222...",vout:1,amount:"100,000 sats",type:"P2WPKH",status:"Constructed"}],
    outputs:[{label:"Output 0 (A)",addr:"bc1q_mixed_A",amount:"99,700 sats",type:"P2WPKH"},{label:"Output 1 (B)",addr:"bc1q_mixed_B",amount:"99,700 sats",type:"P2WPKH"}]},
  {id:"v2-updated",label:"v2: After Updater",cat:"v2",desc:"v2 PSBT after Updater enriched: 1 input with PREVIOUS_TXID, OUTPUT_INDEX, WITNESS_UTXO, and BIP32_DERIVATION. 1 output with AMOUNT, SCRIPT, and BIP32_DERIVATION for change. Compare with ‘v0: After Updater’ to see how metadata attaches identically but tx structure differs.",
    hex:"70736274ff0102020000000102020000000104010105010001060100000e207b1eabe0209b1fe794124575ef807057c77ada2138ae4fa8d6c4de0398a14f3f010f0400000000010100160014d85c2b71d0060b09c9886aeb815e50991dda124d0103040100000006210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179810d90c6a4f540000800000008001000080000000000700000000030008e80300000000000004160014d85c2b71d0060b09c9886aeb815e50991dda124d06210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179810d90c6a4f5400008000000080010000800100000003000000",
    roles:{"Global Map":"Creator: VERSION=2, TX_VERSION=2, 1 input, 1 output, TX_MODIFIABLE=0x00","Input 0 Map":"Creator: PREVIOUS_TXID + OUTPUT_INDEX. Updater: WITNESS_UTXO + SIGHASH_TYPE + BIP32_DERIVATION","Output 0 Map":"Creator: AMOUNT + SCRIPT. Updater: BIP32_DERIVATION for change"},
    utxos:[{label:"Input 0",txid:"7b1eabe0...a14f3f",vout:0,amount:"100,000 sats",type:"P2WPKH",status:"Updated ◐"}],
    outputs:[{label:"Output 0",addr:"bc1qmpwzk...",amount:"1,000 sats",type:"P2WPKH"}]},
  {id:"v2-signed",label:"v2: After Signer",cat:"v2",desc:"v2 PSBT after Signer added PARTIAL_SIG. The input now has a DER-encoded ECDSA signature keyed by the signer’s compressed pubkey. Compare with v0 to see identical sig format — only the tx structure differs.",
    hex:"70736274ff0102020000000102020000000104010105010001060100000e207b1eabe0209b1fe794124575ef807057c77ada2138ae4fa8d6c4de0398a14f3f010f0400000000010100160014d85c2b71d0060b09c9886aeb815e50991dda124d010304010000000222020279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798473044022057b5f2739b2acf4706085e5f1378eab397e25e95666c50951a3d3f02a7dc3ab50220173c3f4f2f1be24cc2e97ad3a1b4f6c5e85d7a0f25e6abbe3be7db2c1ae32dfe0106210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179810d90c6a4f540000800000008001000080000000000700000000030008e80300000000000004160014d85c2b71d0060b09c9886aeb815e50991dda124d00",
    roles:{"Global Map":"Creator: VERSION=2, TX_VERSION=2, 1 input, 1 output","Input 0 Map":"Creator: PREVIOUS_TXID + OUTPUT_INDEX. Updater: WITNESS_UTXO + SIGHASH_TYPE. Signer: PARTIAL_SIG (ECDSA) + BIP32_DERIVATION","Output 0 Map":"Creator: AMOUNT + SCRIPT"},
    utxos:[{label:"Input 0",txid:"7b1eabe0...a14f3f",vout:0,amount:"100,000 sats",type:"P2WPKH",status:"Signed ✓"}],
    outputs:[{label:"Output 0",addr:"bc1qmpwzk...",amount:"1,000 sats",type:"P2WPKH"}]},
  {id:"v2-finalized",label:"v2: Finalized",cat:"v2",desc:"v2 PSBT fully finalized. Non-final fields stripped. FINAL_SCRIPTWITNESS contains [sig, pubkey]. Ready for Extractor to reconstruct the signed transaction from decomposed v2 fields. Compare with v0 — same witness, different structure.",
    hex:"70736274ff0102020000000102020000000104010105010001060100000e207b1eabe0209b1fe794124575ef807057c77ada2138ae4fa8d6c4de0398a14f3f010f040000000008690247304402205d5c29ee65c4c20751ee12f74c2d93eeff7f4e89e8a42b2c5cb3b1e2d7bf66d602207f0ffb90cf9148d3a0c80a122682e0f0e7c988cb2e94f3b52a8f6da0cc5e3a4501210279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f817980000030008e80300000000000004160014d85c2b71d0060b09c9886aeb815e50991dda124d00",
    roles:{"Global Map":"Creator: VERSION=2, TX_VERSION=2, 1 input, 1 output","Input 0 Map":"Creator: PREVIOUS_TXID + OUTPUT_INDEX. Finalizer: FINAL_SCRIPTWITNESS [sig, pubkey]","Output 0 Map":"Creator: AMOUNT + SCRIPT"},
    utxos:[{label:"Input 0",txid:"7b1eabe0...a14f3f",vout:0,amount:"100,000 sats",type:"P2WPKH",status:"Finalized ✓"}],
    outputs:[{label:"Output 0",addr:"bc1qmpwzk...",amount:"1,000 sats",type:"P2WPKH"}]},
];

const FLOWS = {
  "p2wpkh":{title:"P2WPKH (Native SegWit)",emoji:"◇",color:C.green,
    desc:"The standard single-sig SegWit flow. Most common on-chain today. Witness = [sig, pubkey]. Address starts with bc1q.",
    steps:[
      {title:"Raw Unsigned Tx",color:C.amber,
        desc:"A standard Bitcoin tx placed in PSBT_GLOBAL_UNSIGNED_TX. All scriptSigs are empty — signatures live in PSBT maps.",
        fields:[
          {label:"Version",hex:"02000000",color:C.purple,desc:"Tx version 2 (BIP-68 relative locktime)"},
          {label:"Input Count",hex:"01",color:C.dim,desc:"Varint: 1 input"},
          {label:"Prev TXID",hex:"7b1eabe0209b...a14f3f",color:C.orange,desc:"32 bytes, internal byte order"},
          {label:"Prev Vout",hex:"00000000",color:C.orange,desc:"Output index 0 (LE uint32)"},
          {label:"ScriptSig Len",hex:"00",color:C.red,desc:"Empty! Sigs go in PSBT maps, not here"},
          {label:"Sequence",hex:"ffffffff",color:C.dim,desc:"Final, no RBF"},
          {label:"Output Count",hex:"02",color:C.dim,desc:"2 outputs: payment + change"},
          {label:"Out 0 Amount",hex:"e803000000000000",color:C.green,desc:"1,000 sats (64-bit LE) — payment"},
          {label:"Out 0 Script",hex:"160014d85c...124d",color:C.blue,desc:"P2WPKH: OP_0 PUSH20 <hash160>"},
          {label:"Out 1 Amount",hex:"ac81010000000000",color:C.green,desc:"98,780 sats — change"},
          {label:"Out 1 Script",hex:"16001400ae...008f",color:C.blue,desc:"P2WPKH change address"},
          {label:"Locktime",hex:"00000000",color:C.dim,desc:"No locktime"},
        ]},
      {title:"Witness UTXO",color:C.green,
        desc:"PSBT_IN_WITNESS_UTXO: the output being spent. Compact (~30 bytes). The signer needs the amount for BIP-143 sighash.",
        fields:[
          {label:"Amount",hex:"a086010000000000",color:C.amber,desc:"100,000 sats being consumed"},
          {label:"Script Len",hex:"16",color:C.dim,desc:"22 bytes follow"},
          {label:"scriptPubKey",hex:"0014d85c2b71...124d",color:C.blue,desc:"OP_0 PUSH20 <HASH160(pubkey)>"},
        ]},
      {title:"BIP-143 Sighash",color:C.cyan,
        desc:"SegWit sighash commits to the amount (preventing fee attacks). 10 components double-SHA256'd:",
        fields:[
          {label:"1. nVersion",hex:"02000000",color:C.purple,desc:"Tx version (4B)"},
          {label:"2. hashPrevouts",hex:"SHA256d(outpoints)",color:C.orange,desc:"All input txid+vout concatenated"},
          {label:"3. hashSequence",hex:"SHA256d(sequences)",color:C.dim,desc:"All input nSequence values"},
          {label:"4. outpoint",hex:"<txid>+<vout>",color:C.orange,desc:"This input's outpoint (36B)"},
          {label:"5. scriptCode",hex:"1976a914{h}88ac",color:C.blue,desc:"Implicit P2PKH for P2WPKH"},
          {label:"6. value",hex:"a086010000000000",color:C.amber,desc:"100,000 sats — THE key BIP-143 addition"},
          {label:"7. nSequence",hex:"ffffffff",color:C.dim,desc:"This input's sequence"},
          {label:"8. hashOutputs",hex:"SHA256d(outputs)",color:C.green,desc:"All output amount+script"},
          {label:"9. nLockTime",hex:"00000000",color:C.dim,desc:"Locktime"},
          {label:"10. nHashType",hex:"01000000",color:C.red,desc:"SIGHASH_ALL"},
        ]},
      {title:"ECDSA DER Signature",color:C.red,
        desc:"PSBT_IN_PARTIAL_SIG: key = 33-byte compressed pubkey, value = DER signature + sighash byte.",
        fields:[
          {label:"DER tag",hex:"30",color:C.red,desc:"SEQUENCE tag"},
          {label:"Total len",hex:"44",color:C.dim,desc:"68 bytes payload"},
          {label:"r: tag+len",hex:"02 20",color:C.red,desc:"INTEGER + 32B (or 33B if high bit)"},
          {label:"r: value",hex:"(32-33 bytes)",color:C.red,desc:"r component of signature"},
          {label:"s: tag+len",hex:"02 20",color:C.red,desc:"INTEGER + length"},
          {label:"s: value",hex:"(32-33 bytes, low-s)",color:C.red,desc:"s component (BIP-62 low-s)"},
          {label:"Sighash",hex:"01",color:C.amber,desc:"SIGHASH_ALL outside DER envelope"},
        ]},
      {title:"Final Witness Stack",color:C.teal,
        desc:"PSBT_IN_FINAL_SCRIPTWITNESS: Finalizer builds [sig, pubkey]. Strips all non-final fields.",
        fields:[
          {label:"Stack items",hex:"02",color:C.dim,desc:"2 items"},
          {label:"Item 1 len",hex:"47",color:C.dim,desc:"71 bytes (sig)"},
          {label:"Signature",hex:"3044...01",color:C.red,desc:"DER sig + SIGHASH_ALL"},
          {label:"Item 2 len",hex:"21",color:C.dim,desc:"33 bytes (pubkey)"},
          {label:"Pubkey",hex:"0279be66...f81798",color:C.green,desc:"Compressed pubkey"},
        ]},
      {title:"Broadcast Tx",color:C.amber,
        desc:"Extractor inserts witness into unsigned tx. SegWit marker (00) + flag (01) signal witness data.",
        fields:[
          {label:"Version",hex:"02000000",color:C.purple,desc:"Same"},
          {label:"Marker+Flag",hex:"0001",color:C.red,desc:"SegWit signal bytes"},
          {label:"Inputs",hex:"01 <prevout> 00 <seq>",color:C.orange,desc:"Empty scriptSig (0x00)"},
          {label:"Outputs",hex:"02 <out0> <out1>",color:C.green,desc:"Unchanged"},
          {label:"Witness[0]",hex:"02 47<sig> 21<pk>",color:C.teal,desc:"[sig, pubkey]"},
          {label:"Locktime",hex:"00000000",color:C.dim,desc:"Unchanged"},
        ]},
    ]},
  "p2sh-p2wpkh":{title:"P2SH-P2WPKH (Wrapped SegWit)",emoji:"↻",color:C.blue,
    desc:"Backward-compatible SegWit inside P2SH. Address starts with '3'. Needs REDEEM_SCRIPT + witness. Common during the SegWit transition era.",
    steps:[
      {title:"Script Layers",color:C.blue,
        desc:"Two layers: on-chain P2SH hash, and a redeemScript that is a P2WPKH program. PSBT Updater provides PSBT_IN_REDEEM_SCRIPT.",
        fields:[
          {label:"scriptPubKey",hex:"a914<20B-hash>87",color:C.blue,desc:"P2SH: OP_HASH160 <HASH160(redeemScript)> OP_EQUAL"},
          {label:"redeemScript",hex:"0014<20B-pubkeyhash>",color:C.purple,desc:"OP_0 <HASH160(pubkey)> — 22-byte P2WPKH program"},
          {label:"Relationship",hex:"HASH160(redeem) = P2SH hash",color:C.cyan,desc:"Signer verifies hash match"},
        ]},
      {title:"PSBT Input Fields",color:C.green,
        desc:"Updater provides UTXO data AND the redeemScript. Without it, signer can't determine the inner script type.",
        fields:[
          {label:"WITNESS_UTXO",hex:"<8B amt><scriptPubKey>",color:C.green,desc:"The P2SH output being spent"},
          {label:"NON_WITNESS_UTXO",hex:"<full prev tx>",color:C.orange,desc:"Optional but many HW wallets require"},
          {label:"REDEEM_SCRIPT",hex:"0014<20B hash>",color:C.purple,desc:"The 22-byte inner P2WPKH program"},
          {label:"BIP32_DERIVATION",hex:"<pk>→<fp+path>",color:C.amber,desc:"Key derivation for HW wallet"},
        ]},
      {title:"Signing (same as P2WPKH)",color:C.red,
        desc:"Despite P2SH wrapper, signing uses BIP-143 sighash identical to native P2WPKH.",
        fields:[
          {label:"Detection",hex:"redeemScript = 0014...",color:C.cyan,desc:"Signer sees OP_0 PUSH20 → P2WPKH"},
          {label:"scriptCode",hex:"1976a914{h}88ac",color:C.blue,desc:"Same implicit P2PKH as native"},
          {label:"Sighash",hex:"BIP-143",color:C.cyan,desc:"Amount committed — same security"},
          {label:"Signature",hex:"DER + 01",color:C.red,desc:"Standard ECDSA partial sig"},
        ]},
      {title:"Finalization (both scriptSig + witness)",color:C.orange,
        desc:"Unlike native P2WPKH, P2SH-P2WPKH needs BOTH scriptSig AND witness.",
        fields:[
          {label:"FINAL_SCRIPTSIG",hex:"16 0014<20B>",color:C.purple,desc:"PUSH22 <redeemScript> — just pushes the script"},
          {label:"FINAL_WITNESS",hex:"02 47<sig> 21<pk>",color:C.teal,desc:"Same witness as native P2WPKH"},
          {label:"On-chain",hex:"scriptSig + witness both present",color:C.amber,desc:"Both populated in final tx"},
        ]},
    ]},
  "p2wsh-multisig":{title:"P2WSH 2-of-3 Multisig",emoji:"☷",color:C.purple,
    desc:"Native SegWit multisig. witnessScript has full policy. Witness = [OP_0 dummy, sig_A, sig_B, witnessScript].",
    steps:[
      {title:"witnessScript & Locking",color:C.purple,
        desc:"The witnessScript defines 2-of-3. Its SHA256 is in the P2WSH scriptPubKey.",
        fields:[
          {label:"witnessScript",hex:"52 21<pkA> 21<pkB> 21<pkC> 53 ae",color:C.purple,desc:"OP_2 <Alice> <Bob> <Carol> OP_3 OP_CHECKMULTISIG"},
          {label:"scriptPubKey",hex:"0020<32B SHA256>",color:C.blue,desc:"P2WSH: OP_0 PUSH32 SHA256(witnessScript)"},
          {label:"Verify",hex:"SHA256(script) = hash",color:C.cyan,desc:"Signer verifies before signing"},
        ]},
      {title:"BIP-143 for P2WSH",color:C.cyan,
        desc:"P2WSH sighash uses the witnessScript as scriptCode (length-prefixed). Different from P2WPKH!",
        fields:[
          {label:"scriptCode",hex:"<len> 5221..53ae",color:C.purple,desc:"Entire witnessScript (not implicit P2PKH)"},
          {label:"value",hex:"<UTXO amount>",color:C.amber,desc:"Amount committed (BIP-143)"},
          {label:"nHashType",hex:"01000000",color:C.red,desc:"SIGHASH_ALL — all signers same"},
        ]},
      {title:"Partial Signatures",color:C.red,
        desc:"Each co-signer adds one PARTIAL_SIG keyed by their pubkey. Combiner merges.",
        fields:[
          {label:"Alice sig",hex:"02<pkA> → <DER+01>",color:C.red,desc:"PARTIAL_SIG keyed by Alice pubkey"},
          {label:"Bob sig",hex:"02<pkB> → <DER+01>",color:C.red,desc:"PARTIAL_SIG keyed by Bob pubkey"},
          {label:"Carol",hex:"(not needed)",color:C.dim,desc:"2-of-3 met. Carol's key stays cold."},
        ]},
      {title:"Final Witness Stack",color:C.teal,
        desc:"OP_0 dummy (CHECKMULTISIG bug) + sigs in script-order + witnessScript.",
        fields:[
          {label:"Items",hex:"04",color:C.dim,desc:"4 stack items"},
          {label:"Dummy",hex:"00",color:C.dim,desc:"OP_0 for CHECKMULTISIG bug"},
          {label:"Sig A",hex:"47 3044..01",color:C.red,desc:"Alice first (matches script order)"},
          {label:"Sig B",hex:"47 3044..01",color:C.red,desc:"Bob second"},
          {label:"Script",hex:"<len> 5221..53ae",color:C.purple,desc:"The full witnessScript"},
        ]},
    ]},
  "p2tr-keypath":{title:"P2TR Key-Path (Taproot)",emoji:"❀",color:C.teal,
    desc:"Taproot key-path: single Schnorr signature, no script reveal. Maximum privacy. 64-byte sig.",
    steps:[
      {title:"Taproot Output",color:C.teal,
        desc:"P2TR locks to a 32-byte x-only output key Q. Q = P + tG (P = internal key, t = tweak).",
        fields:[
          {label:"scriptPubKey",hex:"5120<32B x-only>",color:C.teal,desc:"OP_1 PUSH32 <output key Q> (witness v1)"},
          {label:"Internal key",hex:"<32B x-only P>",color:C.amber,desc:"PSBT_IN_TAP_INTERNAL_KEY (0x17)"},
          {label:"Tweak",hex:"tagged_hash('TapTweak',P)",color:C.cyan,desc:"Q = P + tG where t = tweak"},
        ]},
      {title:"Schnorr Signing (BIP-340)",color:C.red,
        desc:"Taproot uses Schnorr (not ECDSA). Stored in PSBT_IN_TAP_KEY_SIG (0x13), not PARTIAL_SIG.",
        fields:[
          {label:"Sighash",hex:"BIP-341 (epoch 0x00)",color:C.cyan,desc:"Commits to prevouts, amounts, scriptpubkeys, sequences, outputs, spend_type"},
          {label:"Tweaked key",hex:"d' = d + t",color:C.amber,desc:"Private key d tweaked before signing"},
          {label:"Signature",hex:"64 or 65 bytes",color:C.red,desc:"32B R + 32B s. 64B if SIGHASH_DEFAULT, else 65B with hash type"},
        ]},
      {title:"Witness (simplest possible)",color:C.teal,
        desc:"Just the Schnorr signature. No pubkey push needed — verifier gets Q from scriptPubKey.",
        fields:[
          {label:"Items",hex:"01",color:C.dim,desc:"Single witness item"},
          {label:"Signature",hex:"40 (or 41) bytes",color:C.red,desc:"64-byte Schnorr sig (or 65B)"},
          {label:"Privacy",hex:"—",color:C.green,desc:"Indistinguishable from script-path spend on-chain"},
        ]},
    ]},
  "p2pkh":{title:"P2PKH (Legacy)",emoji:"§",color:C.orange,
    desc:"Original Bitcoin script. No witness. Full prev tx required (NON_WITNESS_UTXO). Address starts with '1'.",
    steps:[
      {title:"Legacy scriptPubKey",color:C.orange,
        desc:"Locks funds to a pubkey hash. Spender provides pubkey + signature in scriptSig.",
        fields:[
          {label:"scriptPubKey",hex:"76a914<20B>88ac",color:C.orange,desc:"OP_DUP OP_HASH160 <hash> OP_EQUALVERIFY OP_CHECKSIG"},
          {label:"Address",hex:"1A1zP1eP5QGefi2D...",color:C.dim,desc:"Base58Check(0x00 + hash + checksum)"},
        ]},
      {title:"NON_WITNESS_UTXO (full tx)",color:C.red,
        desc:"Legacy signing needs the FULL previous transaction — signer hashes it to verify TXID.",
        fields:[
          {label:"PSBT field",hex:"type 0x00",color:C.orange,desc:"Complete prev tx in network serialization"},
          {label:"Why?",hex:"—",color:C.red,desc:"Legacy sighash needs entire tx. TXID verification prevents spoofing."},
          {label:"Size",hex:"~200-2000B/input",color:C.dim,desc:"Much larger than WITNESS_UTXO (~30B)"},
        ]},
      {title:"Legacy Sighash",color:C.cyan,
        desc:"Completely different from BIP-143. Modify a copy of the entire tx, then hash it.",
        fields:[
          {label:"1. Copy tx",hex:"—",color:C.dim,desc:"Start with entire unsigned transaction"},
          {label:"2. Clear sigs",hex:"—",color:C.dim,desc:"Set all scriptSigs to empty"},
          {label:"3. Insert script",hex:"76a914{h}88ac",color:C.blue,desc:"Replace this input's scriptSig with the scriptPubKey being spent"},
          {label:"4. Append type",hex:"01000000",color:C.red,desc:"SIGHASH_ALL as 4-byte LE"},
          {label:"5. Hash",hex:"SHA256d(modified tx)",color:C.cyan,desc:"Double-SHA256 the whole blob"},
        ]},
      {title:"Final scriptSig (no witness)",color:C.teal,
        desc:"PSBT_IN_FINAL_SCRIPTSIG: push sig then push pubkey. No witness at all.",
        fields:[
          {label:"scriptSig",hex:"<len><sig> <len><pk>",color:C.teal,desc:"PUSH <DER+hashtype> PUSH <compressed pubkey>"},
          {label:"Example",hex:"47 3044..01 21 02ab..ef",color:C.teal,desc:"PUSH71 <71B sig> PUSH33 <33B pubkey>"},
          {label:"No witness",hex:"—",color:C.dim,desc:"Legacy has no witness section"},
        ]},
    ]},
  "p2tr-scriptpath":{title:"P2TR Script-Path (Tapscript)",emoji:"❁",color:C.green,
    desc:"Taproot script-path spend: reveals one leaf of the Merkle tree. Witness includes the script, control block (internal key + Merkle proof), and script-level signature. Used for complex spending conditions.",
    steps:[
      {title:"Taproot Tree Structure",color:C.teal,
        desc:"A P2TR output commits to an internal key P and a Merkle root of scripts. The output key Q = P + t·G, where t = tagged_hash('TapTweak', P || merkle_root).",
        fields:[
          {label:"Output Key Q",hex:"5120<32B x-only>",color:C.teal,desc:"OP_1 PUSH32 — witness v1 program"},
          {label:"Internal Key P",hex:"<32B x-only>",color:C.amber,desc:"PSBT_IN_TAP_INTERNAL_KEY (0x17)"},
          {label:"Merkle Root",hex:"tagged_hash(leaves)",color:C.green,desc:"Root of script tree — may have many leaves"},
          {label:"Leaf Script",hex:"20<pk> ac",color:C.purple,desc:"Example: <32B pk> OP_CHECKSIG (tapscript)"},
        ]},
      {title:"PSBT Taproot Fields",color:C.amber,
        desc:"The Updater provides TAP_INTERNAL_KEY, TAP_LEAF_SCRIPT (the specific leaf being used), and TAP_BIP32_DERIVATION for key lookup.",
        fields:[
          {label:"TAP_INTERNAL_KEY",hex:"type 0x17",color:C.amber,desc:"32-byte x-only internal key P"},
          {label:"TAP_LEAF_SCRIPT",hex:"type 0x15",color:C.purple,desc:"Key: control byte + leaf hash. Value: script + leaf version"},
          {label:"TAP_LEAF_HASH",hex:"type 0x14",color:C.green,desc:"32-byte tagged_hash('TapLeaf', version || script)"},
          {label:"TAP_BIP32_DERIV",hex:"type 0x16",color:C.blue,desc:"x-only pk → <leaf_hashes> <fp+path>"},
        ]},
      {title:"BIP-341 Script-Path Sighash",color:C.cyan,
        desc:"Script-path sighash (epoch 0x00) commits to spend_type with ext_flag=1. Includes the leaf hash and key version in the signature message.",
        fields:[
          {label:"epoch",hex:"00",color:C.dim,desc:"BIP-341 epoch byte (always 0x00)"},
          {label:"hash_type",hex:"00 or 01-83",color:C.red,desc:"SIGHASH_DEFAULT (0x00) or others"},
          {label:"spend_type",hex:"0x03",color:C.cyan,desc:"bit0=annex_present, bit1=1 (script-path)"},
          {label:"tapleaf_hash",hex:"tagged_hash(...)",color:C.green,desc:"Commits to specific leaf being executed"},
          {label:"key_version",hex:"00",color:C.dim,desc:"Currently always 0x00"},
          {label:"codesep_pos",hex:"ffffffff",color:C.dim,desc:"OP_CODESEPARATOR position or 0xFFFFFFFF"},
        ]},
      {title:"Schnorr Signature (script key)",color:C.red,
        desc:"Script-path uses the raw (untweaked) private key. PSBT_IN_TAP_SCRIPT_SIG (0x14) stores the sig keyed by [x-only pk || leaf_hash].",
        fields:[
          {label:"Key",hex:"<32B pk><32B leaf_hash>",color:C.amber,desc:"64-byte key data: pubkey + leaf hash"},
          {label:"Signature",hex:"64 or 65 bytes",color:C.red,desc:"Schnorr sig — no tweak applied to private key"},
          {label:"Difference",hex:"key-path: tweaked key",color:C.cyan,desc:"Key-path tweaks d → d+t. Script-path: raw d"},
        ]},
      {title:"Final Witness Stack",color:C.teal,
        desc:"Script-path witness: [<sig(s)>, <script>, <control block>]. The control block = leaf_version | internal_key | merkle_proof.",
        fields:[
          {label:"Items",hex:"03+",color:C.dim,desc:"At least 3: sig(s), script, control block"},
          {label:"Sig",hex:"40 <64B Schnorr>",color:C.red,desc:"Schnorr signature(s) as needed by script"},
          {label:"Script",hex:"<leaf script bytes>",color:C.purple,desc:"The tapscript being executed"},
          {label:"Control Block",hex:"c0 <32B P> [proof]",color:C.green,desc:"0xc0|parity + internal key P + Merkle siblings (32B each)"},
          {label:"Verifier",hex:"—",color:C.cyan,desc:"Reconstructs Q from control block; checks against scriptPubKey"},
        ]},
    ]},
  "p2sh-p2wsh":{title:"P2SH-P2WSH (Wrapped Multisig)",emoji:"⊞",color:C.red,
    desc:"P2WSH multisig wrapped inside P2SH for backward compatibility. Three script layers: P2SH → redeemScript (P2WSH) → witnessScript (multisig). Address starts with '3'. Common in legacy multisig setups.",
    steps:[
      {title:"Three Script Layers",color:C.red,
        desc:"Three levels of nesting: on-chain P2SH hash → redeemScript is a P2WSH program → witnessScript is the actual multisig.",
        fields:[
          {label:"scriptPubKey",hex:"a914<20B hash>87",color:C.red,desc:"P2SH: OP_HASH160 <HASH160(redeemScript)> OP_EQUAL"},
          {label:"redeemScript",hex:"0020<32B SHA256>",color:C.purple,desc:"P2WSH program: OP_0 PUSH32 <SHA256(witnessScript)>"},
          {label:"witnessScript",hex:"52 21<pkA> 21<pkB> 53 ae",color:C.blue,desc:"OP_2 <Alice> <Bob> OP_2 OP_CHECKMULTISIG"},
          {label:"Verification",hex:"HASH160(redeem)=P2SH",color:C.cyan,desc:"AND SHA256(witness)=P2WSH hash"},
        ]},
      {title:"PSBT Input Fields",color:C.green,
        desc:"Updater must provide ALL three components: UTXO, redeemScript, AND witnessScript. Missing any → signer can't proceed.",
        fields:[
          {label:"NON_WITNESS_UTXO",hex:"<full prev tx>",color:C.orange,desc:"Many HW wallets require full tx for wrapped SegWit"},
          {label:"WITNESS_UTXO",hex:"<8B amt><P2SH script>",color:C.green,desc:"The P2SH output being spent"},
          {label:"REDEEM_SCRIPT",hex:"0020<32B>",color:C.purple,desc:"34-byte P2WSH program (inner script of P2SH)"},
          {label:"WITNESS_SCRIPT",hex:"52 21<pkA> 21<pkB> 53 ae",color:C.blue,desc:"Actual multisig script revealed in witness"},
          {label:"BIP32_DERIVATION",hex:"<pk>→<fp+path> (×2)",color:C.amber,desc:"One per co-signer's key"},
        ]},
      {title:"Signing (BIP-143 + witnessScript)",color:C.cyan,
        desc:"Signer navigates the layers: P2SH → sees redeemScript is P2WSH → uses witnessScript as scriptCode in BIP-143 sighash.",
        fields:[
          {label:"Detection",hex:"redeemScript=0020...",color:C.purple,desc:"Signer sees OP_0 PUSH32 → P2WSH inside P2SH"},
          {label:"scriptCode",hex:"<len> 5221...53ae",color:C.blue,desc:"witnessScript used as scriptCode (NOT redeemScript)"},
          {label:"value",hex:"<UTXO amount>",color:C.amber,desc:"Amount committed via BIP-143"},
          {label:"Each signer",hex:"PARTIAL_SIG keyed by pk",color:C.red,desc:"Standard ECDSA DER + sighash byte"},
        ]},
      {title:"Finalization (scriptSig + witness)",color:C.orange,
        desc:"Needs BOTH: scriptSig pushes the redeemScript, witness carries [OP_0, sigs, witnessScript]. Three layers resolved.",
        fields:[
          {label:"FINAL_SCRIPTSIG",hex:"23 0020<32B>",color:C.purple,desc:"PUSH34 <redeemScript> — pushes the P2WSH program"},
          {label:"FINAL_WITNESS",hex:"04 00 47<sigA> 47<sigB> <ws>",color:C.teal,desc:"[OP_0, sig_A, sig_B, witnessScript]"},
          {label:"On-chain",hex:"both scriptSig + witness",color:C.amber,desc:"scriptSig reveals P2WSH; witness reveals multisig"},
          {label:"Size",hex:"~300-400 bytes",color:C.dim,desc:"Heavier than native P2WSH due to P2SH overhead"},
        ]},
    ]},
  "sighash":{title:"Sighash Types Compared",emoji:"✂️",color:C.cyan,
    desc:"Bitcoin supports 6 sighash types that control what parts of the transaction a signature commits to. Understanding sighash is crucial for advanced PSBT workflows like CoinJoin, payment channels, and auction-style transactions.",
    steps:[
      {title:"SIGHASH_ALL (0x01)",color:C.green,
        desc:"Default and most common. Signs ALL inputs and ALL outputs. Any modification invalidates the signature. Used for standard payments.",
        fields:[
          {label:"Inputs",hex:"ALL committed",color:C.green,desc:"hashPrevouts = SHA256d(all outpoints)"},
          {label:"Outputs",hex:"ALL committed",color:C.green,desc:"hashOutputs = SHA256d(all outputs)"},
          {label:"Security",hex:"Maximum",color:C.green,desc:"Nobody can change anything after signing"},
          {label:"PSBT field",hex:"03 → 01000000",color:C.amber,desc:"PSBT_IN_SIGHASH_TYPE = 0x01"},
          {label:"Use case",hex:"—",color:C.dim,desc:"Standard payments, most transactions"},
        ]},
      {title:"SIGHASH_NONE (0x02)",color:C.red,
        desc:"Signs all inputs but NO outputs. Anyone can attach any outputs. Dangerous — use with ANYONECANPAY for specific protocols.",
        fields:[
          {label:"Inputs",hex:"ALL committed",color:C.green,desc:"All inputs locked"},
          {label:"Outputs",hex:"NONE committed",color:C.red,desc:"hashOutputs = 0x00...00 (32 zero bytes)"},
          {label:"Risk",hex:"HIGH",color:C.red,desc:"Anyone who sees this sig can redirect the funds"},
          {label:"PSBT field",hex:"03 → 02000000",color:C.amber,desc:"PSBT_IN_SIGHASH_TYPE = 0x02"},
          {label:"Use case",hex:"—",color:C.dim,desc:"\"I'm spending, you decide where it goes\""},
        ]},
      {title:"SIGHASH_SINGLE (0x03)",color:C.orange,
        desc:"Signs all inputs and ONLY the output at the same index as this input. Other outputs can be added/changed freely.",
        fields:[
          {label:"Inputs",hex:"ALL committed",color:C.green,desc:"All inputs locked"},
          {label:"Outputs",hex:"MATCHING INDEX only",color:C.orange,desc:"Only output[i] for input[i]. Others free."},
          {label:"Edge case",hex:"No matching output",color:C.red,desc:"If input index > output count → signs hash 0x01 (bug preserved for consensus)"},
          {label:"PSBT field",hex:"03 → 03000000",color:C.amber,desc:"PSBT_IN_SIGHASH_TYPE = 0x03"},
          {label:"Use case",hex:"—",color:C.dim,desc:"Colored coins, atomic swaps, output pairing"},
        ]},
      {title:"ANYONECANPAY (0x80 modifier)",color:C.purple,
        desc:"Modifier bit — combine with ALL/NONE/SINGLE. Signs ONLY this input (not all). Others can add more inputs freely.",
        fields:[
          {label:"This input",hex:"committed",color:C.green,desc:"Only this input's outpoint signed"},
          {label:"Other inputs",hex:"NOT committed",color:C.purple,desc:"hashPrevouts = 0x00...00, hashSequence = 0x00...00"},
          {label:"0x81 (ALL|ACP)",hex:"this in + all outs",color:C.blue,desc:"\"I'll pay my share, don't change outputs\" — crowdfunding"},
          {label:"0x82 (NONE|ACP)",hex:"this in + no outs",color:C.red,desc:"\"Take my coins, do whatever\" — donation"},
          {label:"0x83 (SINGLE|ACP)",hex:"this in + 1 out",color:C.orange,desc:"\"My input pays my output\" — DEX-style"},
        ]},
      {title:"Taproot Sighash (BIP-341)",color:C.teal,
        desc:"Taproot adds SIGHASH_DEFAULT (0x00) and changes what data is committed. All sighash types commit to amounts and scriptPubKeys of ALL inputs (preventing fee attacks).",
        fields:[
          {label:"DEFAULT (0x00)",hex:"64-byte sig",color:C.teal,desc:"Same as ALL but 64-byte sig (no sighash byte appended)"},
          {label:"ALL prevouts",hex:"always committed",color:C.green,desc:"All input amounts + scripts committed (unlike legacy)"},
          {label:"epoch byte",hex:"0x00",color:C.dim,desc:"Future-proofs sighash algorithm versioning"},
          {label:"annex",hex:"optional",color:C.purple,desc:"If present, its hash is committed (spend_type bit 0)"},
          {label:"Benefit",hex:"—",color:C.cyan,desc:"Prevents fee-overpayment without needing NON_WITNESS_UTXO"},
        ]},
    ]},
};

const SCENARIOS = [
  {
    id:"simple",title:"Simple P2WPKH Send",emoji:"→",color:C.green,
    summary:"Alice sends 0.001 BTC to Bob from her native SegWit wallet. The most common PSBT use case — a single signer spending one input to a payment + change output. The PSBT travels from her watch-only desktop wallet to her hardware wallet and back.",
    inputs:[{txid:"7b1eabe0209b1fe794124575ef807057c77ada2138ae4fa8d6c4de0398a14f3f",vout:0,amount:100000,type:"P2WPKH",label:"Alice's UTXO",path:"m/84'/0'/0'/0/7"}],
    outputs:[{addr:"bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",amount:1000,label:"Bob (payment)"},{addr:"bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",amount:98780,label:"Alice (change)"}],
    fee:220,
    stages:[
      {role:"Creator",color:C.amber,text:"Alice's desktop wallet (watch-only — has xpubs but no private keys) creates the PSBT. It builds an unsigned transaction with one input pointing to Alice's UTXO (txid:vout) and two outputs: 1,000 sats to Bob's address and 98,780 sats back to Alice's change address. The scriptSig is empty, no witness data. This unsigned transaction is placed in PSBT_GLOBAL_UNSIGNED_TX.",fields:["PSBT_GLOBAL_UNSIGNED_TX"]},
      {role:"Updater",color:C.blue,text:"The same desktop wallet acts as Updater. It looks up the UTXO in its blockchain data and attaches PSBT_IN_WITNESS_UTXO — the previous output being spent (100,000 sats with Alice's P2WPKH scriptPubKey OP_0 <hash160(pubkey)>).\n\nIt adds PSBT_IN_BIP32_DERIVATION mapping Alice's compressed pubkey to derivation path m/84'/0'/0'/0/7 with her master fingerprint. For the change output (index 1), it adds PSBT_OUT_BIP32_DERIVATION so the hardware wallet can verify the change belongs to Alice.",fields:["PSBT_IN_WITNESS_UTXO","PSBT_IN_BIP32_DERIVATION","PSBT_OUT_BIP32_DERIVATION"]},
      {role:"Signer",color:C.green,text:"Alice plugs in her hardware wallet (or scans a QR code for air-gapped signing). The device receives the PSBT and:\n\n1. Reads WITNESS_UTXO to get the input amount (100,000 sats)\n2. Computes total output value (1,000 + 98,780 = 99,780) and derives the fee (220 sats)\n3. Reads BIP32_DERIVATION, finds its master fingerprint, derives private key at m/84'/0'/0'/0/7\n4. Verifies the change output derivation matches its own wallet\n5. Displays on its secure screen: \"Send 1,000 sats to bc1qw508...? Fee: 220 sats.\"\n6. After Alice confirms, computes the BIP-143 SegWit sighash (SIGHASH_ALL)\n7. Signs with ECDSA, producing a DER-encoded signature\n8. Stores as PSBT_IN_PARTIAL_SIG keyed by Alice's compressed pubkey",fields:["PSBT_IN_PARTIAL_SIG","PSBT_IN_SIGHASH_TYPE"]},
      {role:"Finalizer",color:C.orange,text:"Back on the desktop wallet, the Finalizer processes the signed PSBT. For P2WPKH, finalization is straightforward:\n\n1. Take the single partial signature and Alice's public key\n2. Construct the scriptWitness stack: [<71-byte DER sig + sighash byte>, <33-byte compressed pubkey>]\n3. Store as PSBT_IN_FINAL_SCRIPTWITNESS\n4. The scriptSig remains empty (native SegWit has no scriptSig)\n5. Strip all non-final fields: PARTIAL_SIG, WITNESS_UTXO, BIP32_DERIVATION, SIGHASH_TYPE\n\nThe input is now finalized and locked.",fields:["PSBT_IN_FINAL_SCRIPTWITNESS"]},
      {role:"Extractor",color:C.cyan,text:"The Extractor verifies that input 0 has FINAL_SCRIPTWITNESS. It takes the unsigned transaction from PSBT_GLOBAL_UNSIGNED_TX, inserts the finalized witness data into the transaction's witness section, and serializes the complete signed transaction.\n\nThe resulting raw transaction hex can be broadcast via any Bitcoin node's sendrawtransaction RPC, a block explorer's broadcast page, or a mobile wallet's network. The PSBT has served its purpose and can be deleted.",fields:[]},
    ],
  },
  {
    id:"multisig",title:"2-of-3 Multisig (P2WSH)",emoji:"☷",color:C.purple,
    summary:"A company treasury protected by 2-of-3 multisig. Three co-signers (Alice, Bob, Carol) each hold one key on separate hardware wallets. The PSBT must collect two signatures. This showcases the Combiner role — Alice and Bob sign separate copies that are merged.",
    inputs:[{txid:"a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890",vout:0,amount:5000000,type:"P2WSH 2-of-3",label:"Treasury UTXO",path:"m/48'/0'/0'/2'/0/0"}],
    outputs:[{addr:"bc1qvendor_payment_address",amount:4500000,label:"Vendor payment"},{addr:"bc1qtreasury_change_address",amount:499700,label:"Treasury (change)"}],
    fee:300,
    stages:[
      {role:"Creator",color:C.amber,text:"The coordinator wallet creates a PSBT spending the treasury's UTXO (5,000,000 sats in a 2-of-3 P2WSH). The unsigned transaction has one input and two outputs: vendor payment (4,500,000 sats) and change (499,700 sats), with a 300 sat fee.",fields:["PSBT_GLOBAL_UNSIGNED_TX"]},
      {role:"Updater",color:C.blue,text:"The coordinator enriches the PSBT:\n\n• PSBT_IN_WITNESS_UTXO: The 5M sat output with P2WSH scriptPubKey (OP_0 <sha256(witnessScript)>)\n• PSBT_IN_WITNESS_SCRIPT: The multisig script — OP_2 <pubkeyAlice> <pubkeyBob> <pubkeyCarol> OP_3 OP_CHECKMULTISIG\n• Three PSBT_IN_BIP32_DERIVATION entries: one per co-signer pubkey → fingerprint + m/48'/0'/0'/2'/0/0\n• PSBT_OUT_BIP32_DERIVATION on the change output\n\nThe coordinator emails two copies — one to Alice, one to Bob.",fields:["PSBT_IN_WITNESS_UTXO","PSBT_IN_WITNESS_SCRIPT","PSBT_IN_BIP32_DERIVATION (×3)","PSBT_OUT_BIP32_DERIVATION"]},
      {role:"Signer (Alice)",color:C.green,text:"Alice's hardware wallet reads the PSBT:\n\n1. Identifies 2-of-3 multisig from the WITNESS_SCRIPT\n2. Finds her fingerprint in the BIP32_DERIVATION entries\n3. Derives her private key at m/48'/0'/0'/2'/0/0\n4. Reads WITNESS_UTXO amount (5M sats), computes fee (300 sats)\n5. Displays: \"Multisig spend: 4.5M sats to bc1qvendor...? Fee: 300 sats.\"\n6. After confirmation, computes BIP-143 sighash using the witnessScript\n7. Signs with ECDSA, stores as PSBT_IN_PARTIAL_SIG keyed by Alice's pubkey\n\nAlice's copy now has 1 of 2 required signatures.",fields:["PSBT_IN_PARTIAL_SIG (Alice)"]},
      {role:"Signer (Bob)",color:C.teal,text:"Bob independently receives his copy (from the coordinator, not Alice). His hardware wallet:\n\n1. Identifies the multisig and locates Bob's key via BIP32 derivation\n2. Verifies transaction details on his device screen\n3. Signs and stores partial sig keyed by Bob's pubkey\n\nBob's copy has 1 of 2 required signatures (Bob's, not Alice's). Key PSBT benefit: Alice and Bob sign independently and in parallel — neither needs the other's signature first.",fields:["PSBT_IN_PARTIAL_SIG (Bob)"]},
      {role:"Combiner",color:C.purple,text:"The coordinator receives both signed PSBTs and merges them:\n\n1. Verifies both have the same unsigned transaction (byte-for-byte identical)\n2. For each map, takes the union of all key-value pairs\n3. Alice's PARTIAL_SIG (keyed by her pubkey) and Bob's (keyed by his) are different keys — they merge without conflict\n4. All other fields should be identical; if not, merge fails\n\nThe combined PSBT now has both partial signatures — enough for the 2-of-3 threshold.",fields:["PSBT_IN_PARTIAL_SIG (Alice + Bob)"]},
      {role:"Finalizer",color:C.orange,text:"The Finalizer checks: witnessScript requires 2-of-3, we have 2 sigs. Sufficient!\n\nFor P2WSH multisig, the scriptWitness stack:\n[OP_0 (dummy for CHECKMULTISIG bug), <Alice's sig>, <Bob's sig>, <witnessScript>]\n\nCritically, signatures must appear in the same order as pubkeys in the witnessScript. The Finalizer stores this as PSBT_IN_FINAL_SCRIPTWITNESS and strips all non-final fields.",fields:["PSBT_IN_FINAL_SCRIPTWITNESS"]},
      {role:"Extractor",color:C.cyan,text:"The Extractor inserts the finalized witness into the unsigned transaction. The witness for input 0 contains: the dummy OP_0, Alice's sig, Bob's sig, and the witnessScript.\n\nThe transaction is broadcast. The treasury UTXO is spent with 2-of-3 authorization — Carol's key was never needed.",fields:[]},
    ],
  },
  {
    id:"coinjoin",title:"CoinJoin with PSBT v2",emoji:"⥁",color:C.cyan,
    summary:"Three participants create a CoinJoin for privacy. PSBT v2 is essential because inputs and outputs are added incrementally as participants register. TX_MODIFIABLE flags enable dynamic construction — impossible with v0's fixed unsigned transaction.",
    inputs:[
      {txid:"aaaa1111...aaaa1111",vout:0,amount:100000,type:"P2WPKH",label:"Participant A",path:"m/84'/0'/0'/0/12"},
      {txid:"bbbb2222...bbbb2222",vout:1,amount:100000,type:"P2WPKH",label:"Participant B",path:"m/84'/0'/0'/0/5"},
      {txid:"cccc3333...cccc3333",vout:3,amount:100000,type:"P2WPKH",label:"Participant C",path:"m/84'/0'/0'/0/19"},
    ],
    outputs:[
      {addr:"bc1q_mixed_output_A",amount:99700,label:"A's mixed output"},
      {addr:"bc1q_mixed_output_B",amount:99700,label:"B's mixed output"},
      {addr:"bc1q_mixed_output_C",amount:99700,label:"C's mixed output"},
    ],
    fee:900,
    stages:[
      {role:"Creator (Coordinator)",color:C.amber,text:"The CoinJoin coordinator creates a PSBT v2 — an empty transaction shell:\n\n• PSBT_GLOBAL_VERSION = 2 (required for v2)\n• PSBT_GLOBAL_TX_VERSION = 2\n• PSBT_GLOBAL_INPUT_COUNT = 0 (no inputs yet)\n• PSBT_GLOBAL_OUTPUT_COUNT = 0 (no outputs yet)\n• PSBT_GLOBAL_TX_MODIFIABLE = 0x03 (bits 0+1: inputs AND outputs modifiable)\n\nThis is the key v2 innovation: the PSBT starts as a modifiable shell. In v0, you'd need all inputs/outputs upfront.",fields:["PSBT_GLOBAL_VERSION=2","PSBT_GLOBAL_TX_VERSION","PSBT_GLOBAL_INPUT_COUNT=0","PSBT_GLOBAL_OUTPUT_COUNT=0","PSBT_GLOBAL_TX_MODIFIABLE=0x03"]},
      {role:"Constructor (A)",color:C.green,text:"Participant A registers by adding their input and output:\n\nNew input map:\n• PSBT_IN_PREVIOUS_TXID = aaaa1111...\n• PSBT_IN_OUTPUT_INDEX = 0\n• PSBT_IN_SEQUENCE = 0xFFFFFFFE\n• PSBT_IN_WITNESS_UTXO = 100,000 sats + P2WPKH script\n• PSBT_IN_BIP32_DERIVATION for A's key\n\nNew output map:\n• PSBT_OUT_AMOUNT = 99,700 sats (minus fee share)\n• PSBT_OUT_SCRIPT = A's P2WPKH scriptPubKey\n\nGLOBAL_INPUT_COUNT → 1, GLOBAL_OUTPUT_COUNT → 1. TX_MODIFIABLE stays 0x03.",fields:["PSBT_IN_PREVIOUS_TXID","PSBT_IN_OUTPUT_INDEX","PSBT_IN_WITNESS_UTXO","PSBT_OUT_AMOUNT","PSBT_OUT_SCRIPT"]},
      {role:"Constructor (B & C)",color:C.teal,text:"B and C each add their input and output. After all register:\n\n• GLOBAL_INPUT_COUNT = 3, GLOBAL_OUTPUT_COUNT = 3\n• Three input maps with PREVIOUS_TXID, OUTPUT_INDEX, WITNESS_UTXO, BIP32_DERIVATION\n• Three output maps with equal AMOUNT (99,700 sats) and SCRIPT\n\nEqual outputs provide CoinJoin privacy — observers can't link inputs to outputs.\n\nWhen registration closes, coordinator sets TX_MODIFIABLE = 0x00, permanently locking the transaction shape.",fields:["3× PSBT_IN_PREVIOUS_TXID","3× PSBT_OUT_AMOUNT","TX_MODIFIABLE → 0x00"]},
      {role:"Signer (each)",color:C.blue,text:"Each participant signs only their own input:\n\n• A signs input 0 — verifies all outputs are equal-value, confirms their output is present, checks fee is reasonable (300 sats/participant)\n• B signs input 1 — same verification\n• C signs input 2 — same verification\n\nEach signer can verify the full transaction without seeing others' private keys. They confirm the CoinJoin is fair: equal outputs, reasonable fees, own output included.",fields:["PSBT_IN_PARTIAL_SIG (per input)"]},
      {role:"Finalizer + Extractor",color:C.orange,text:"After collecting all signatures, the Finalizer processes each input:\n\n• Input 0: witness = [A's sig, A's pubkey]\n• Input 1: witness = [B's sig, B's pubkey]\n• Input 2: witness = [C's sig, C's pubkey]\n\nEach is standard P2WPKH finalization. Non-final fields stripped.\n\nThe Extractor reconstructs the unsigned tx from v2 decomposed fields (tx_version, each input's previous_txid + output_index + sequence, each output's amount + script), inserts witnesses, and produces the signed transaction.\n\nResult: 3 inputs, 3 equal outputs — on-chain, it's impossible to link which input paid which output.",fields:["PSBT_IN_FINAL_SCRIPTWITNESS (×3)"]},
    ],
  },
];

const GLOBAL_V0 = [
  {key:"0x00",name:"PSBT_GLOBAL_UNSIGNED_TX",req:true,color:C.amber,kd:"None (empty key data)",vd:"Complete transaction in network serialization",
    desc:"The core of a v0 PSBT. Contains the complete unsigned transaction: version (4 bytes), input count, each input (32-byte prev txid + 4-byte vout + empty scriptSig + 4-byte sequence), output count, each output (8-byte amount + scriptPubKey), locktime (4 bytes).\n\nAll scriptSigs must be empty and no witness data present. MUST be present exactly once in v0. MUST NOT be present in v2. The Extractor uses this as the base transaction and fills in finalized scripts/witnesses.",
    ex:{k:"00",v:"0200000001aad739...00000000",m:"Version 2, 1 input, 2 outputs, locktime 0"}},
  {key:"0x01",name:"PSBT_GLOBAL_XPUB",req:false,color:C.blue,kd:"78-byte serialized extended public key",vd:"4-byte master fingerprint + derivation path indices (4 bytes LE each)",
    desc:"Carries a BIP32 extended public key and its derivation from the master. In 2-of-3 multisig, there'd be three entries — one per co-signer. Key-data is the 78-byte xpub (depth, fingerprint, child number, chain code, key). Value is master fingerprint (first 4 bytes of HASH160 of master pubkey) + path indices.",
    ex:{k:"01 0488b21e...(78B)",v:"d90c6a4f 54000080 00000080 00000080",m:"Fingerprint: d90c6a4f, Path: m/84'/0'/0'"}},
  {key:"0xFB",name:"PSBT_GLOBAL_VERSION",req:false,color:C.purple,kd:"None",vd:"32-bit LE unsigned integer",
    desc:"PSBT version number. If omitted → version 0. Version 0 MUST include UNSIGNED_TX. Version 2 (BIP-370) MUST NOT include UNSIGNED_TX. A signer encountering an unknown version MUST reject the PSBT — higher versions may change signing semantics.",
    ex:{k:"fb",v:"00000000",m:"Version: 0"}},
  {key:"0xFC",name:"PSBT_GLOBAL_PROPRIETARY",req:false,color:C.dim,kd:"Compact-size prefix + subtype + key data",vd:"Application-specific data",
    desc:"Vendor-specific data. Key starts with a compact-size-encoded identifier (e.g., \"LEDGER\"), followed by subtype byte + optional key data. Allows wallet vendors to embed labels, policy info, or custom instructions without conflicting with standard fields. Unrecognized prefixes should be ignored.",
    ex:{k:"fc 06 4c45444745520100",v:"(vendor data)",m:"Prefix: LEDGER, Subtype: 0x01"}},
];

const INPUT_V0 = [
  {key:"0x00",name:"PSBT_IN_NON_WITNESS_UTXO",req:false,color:C.orange,kd:"None",vd:"Full serialized previous transaction",
    desc:"The entire previous transaction that created the UTXO being spent. Required for legacy (non-SegWit) inputs. After the fee-overpayment attack (discovered by Trezor), many hardware wallets now require BOTH NON_WITNESS_UTXO and WITNESS_UTXO for SegWit inputs — the full prev tx lets signers verify the WITNESS_UTXO amount independently.",
    ex:{k:"00",v:"02000000...(full prev tx)",m:"Full previous transaction (~200-500 bytes)"}},
  {key:"0x01",name:"PSBT_IN_WITNESS_UTXO",req:false,color:C.green,kd:"None",vd:"8-byte LE amount + scriptPubKey (compact-size prefixed)",
    desc:"Just the output being spent: amount (8-byte LE sats) + scriptPubKey. Compact (~30-40 bytes). For P2WPKH: OP_0 <20-byte-hash>. For P2WSH: OP_0 <32-byte-hash>. The amount is committed to in SegWit sighash (BIP-143), preventing fee-overpayment attacks.",
    ex:{k:"01",v:"a086010000000000 160014d85c..124d",m:"100,000 sats + P2WPKH script"}},
  {key:"0x02",name:"PSBT_IN_PARTIAL_SIG",req:false,color:C.red,kd:"33-byte compressed pubkey",vd:"DER-encoded ECDSA signature + sighash type byte",
    desc:"A signature by one signer. Key-data = signing pubkey, so multisig can have multiple entries with different pubkeys. Sig format: 0x30 <len> 0x02 <r-len> <r> 0x02 <s-len> <s> <sighash-byte> (71-72 bytes). The Combiner merges partial sigs from different PSBTs. For Taproot, use TAP_KEY_SIG (0x13) or TAP_SCRIPT_SIG (0x14) instead.",
    ex:{k:"02 0279be66...f81798",v:"3044022057...3a0b01",m:"ECDSA DER sig + SIGHASH_ALL"}},
  {key:"0x03",name:"PSBT_IN_SIGHASH_TYPE",req:false,color:C.cyan,kd:"None",vd:"32-bit LE unsigned integer",
    desc:"Which sighash type to use. Default: SIGHASH_ALL (0x01) if absent.\n\n• 0x01 SIGHASH_ALL — all inputs + all outputs (standard)\n• 0x02 SIGHASH_NONE — all inputs, no outputs\n• 0x03 SIGHASH_SINGLE — all inputs + matching output\n• 0x80 ANYONECANPAY modifier — only this input. Combine: 0x81, 0x82, 0x83",
    ex:{k:"03",v:"01000000",m:"SIGHASH_ALL (0x01)"}},
  {key:"0x04",name:"PSBT_IN_REDEEM_SCRIPT",req:false,color:C.purple,kd:"None",vd:"redeemScript bytes",
    desc:"For P2SH or P2SH-wrapped SegWit inputs. P2SH-P2WPKH: OP_0 <20-byte-hash>. P2SH-P2WSH: OP_0 <32-byte-hash>. Bare P2SH multisig: the actual multisig script. Needed by signers for sighash computation and by finalizers for scriptSig construction.",
    ex:{k:"04",v:"001453ad...71cd",m:"OP_0 PUSH20 <hash> (P2SH-P2WPKH)"}},
  {key:"0x05",name:"PSBT_IN_WITNESS_SCRIPT",req:false,color:C.blue,kd:"None",vd:"witnessScript bytes",
    desc:"The actual script for P2WSH/P2SH-P2WSH — e.g., OP_2 <pk1> <pk2> <pk3> OP_3 OP_CHECKMULTISIG. Its SHA256 must match the 32-byte hash in the P2WSH scriptPubKey. Signer uses it for BIP-143 sighash; Finalizer includes it as the last witness stack item. Not needed for P2WPKH.",
    ex:{k:"05",v:"5221...53ae",m:"OP_2 <pkA> <pkB> <pkC> OP_3 OP_CMS"}},
  {key:"0x06",name:"PSBT_IN_BIP32_DERIVATION",req:false,color:C.amber,kd:"33-byte compressed pubkey",vd:"4-byte master fingerprint + path (4 bytes LE per index)",
    desc:"Maps a pubkey to its BIP32 derivation. Tells the signer: \"pubkey 02abc...def was derived at m/84'/0'/0'/0/7 from master fingerprint 0xd90c6a4f.\" Hardware wallets use this to find the correct private key. Multiple entries per input for multisig. Fingerprint = first 4 bytes of HASH160(master_pubkey). Indices >= 0x80000000 = hardened.",
    ex:{k:"06 0279be66...",v:"d90c6a4f 54000080 00000080 00000080 00000000 07000000",m:"m/84'/0'/0'/0/7"}},
  {key:"0x07",name:"PSBT_IN_FINAL_SCRIPTSIG",req:false,color:C.teal,kd:"None",vd:"Fully constructed scriptSig",
    desc:"Set by the Finalizer. Native SegWit: absent/empty. P2SH-wrapped SegWit: redeemScript push. Legacy P2PKH: <sig> <pubkey>. Legacy P2SH multisig: OP_0 <sig1> <sig2> <redeemScript>. Once set, Finalizer MUST remove: PARTIAL_SIG, SIGHASH_TYPE, REDEEM_SCRIPT, WITNESS_SCRIPT, BIP32_DERIVATION.",
    ex:{k:"07",v:"160014...d4e1",m:"P2SH-P2WPKH: PUSH <redeemScript>"}},
  {key:"0x08",name:"PSBT_IN_FINAL_SCRIPTWITNESS",req:false,color:C.teal,kd:"None",vd:"Serialized witness stack",
    desc:"Finalized witness. Encoded as compact-size item count + each item (compact-size length + data). P2WPKH: [<sig>, <pubkey>]. P2WSH multisig: [OP_0, <sig1>, <sig2>, <witnessScript>]. Once set, all non-final fields stripped. Extractor reads this and inserts into tx witness section.",
    ex:{k:"08",v:"0247304402...0121027...98",m:"[<71B sig>, <33B pubkey>]"}},
];

const OUTPUT_V0 = [
  {key:"0x00",name:"PSBT_OUT_REDEEM_SCRIPT",req:false,color:C.purple,kd:"None",vd:"redeemScript bytes",
    desc:"The redeemScript for this output if P2SH. Informational — tells wallet software what script is behind the P2SH hash for future spending (typically change outputs).",
    ex:{k:"00",v:"00143ab2...d4e1",m:"P2SH-P2WPKH redeemScript"}},
  {key:"0x01",name:"PSBT_OUT_WITNESS_SCRIPT",req:false,color:C.blue,kd:"None",vd:"witnessScript bytes",
    desc:"The witnessScript for P2WSH outputs. Informational — preserves the script so the wallet can build spending PSBTs later. For 2-of-3 multisig: the full OP_2 <pk1> <pk2> <pk3> OP_3 OP_CHECKMULTISIG.",
    ex:{k:"01",v:"5221...53ae",m:"Multisig witnessScript"}},
  {key:"0x02",name:"PSBT_OUT_BIP32_DERIVATION",req:false,color:C.amber,kd:"33-byte compressed pubkey",vd:"4-byte fingerprint + path",
    desc:"How wallets identify change outputs. A hardware wallet seeing this can display \"Change: 0.00098780 BTC\" instead of \"Unknown output.\" It verifies: the scriptPubKey derived from this path matches the output, confirming legitimate change. Multiple entries for multisig outputs.",
    ex:{k:"02 0279be66...",v:"d90c6a4f ...01000000 03000000",m:"m/84'/0'/0'/1/3 (change)"}},
];

const V2_GLOBAL = [
  {key:"0x02",name:"PSBT_GLOBAL_TX_VERSION",req:true,color:C.amber,kd:"None",vd:"32-bit LE uint",desc:"Transaction version (1 or 2). In v0 this was inside the unsigned tx. Version 2 enables BIP-68/BIP-112 relative lock-time.",ex:{k:"02",v:"02000000",m:"Tx version: 2"}},
  {key:"0x03",name:"PSBT_GLOBAL_FALLBACK_LOCKTIME",req:false,color:C.orange,kd:"None",vd:"32-bit LE uint",desc:"Fallback nLockTime if no input specifies REQUIRED_TIME/HEIGHT_LOCKTIME. The Finalizer uses max of all per-input requirements; falls back here if none exist. Default 0.",ex:{k:"03",v:"00000000",m:"Locktime: 0"}},
  {key:"0x04",name:"PSBT_GLOBAL_INPUT_COUNT",req:true,color:C.green,kd:"None",vd:"Compact size uint",desc:"Number of inputs. Must match actual input map count. Changes during construction when Constructors add inputs.",ex:{k:"04",v:"02",m:"2 inputs"}},
  {key:"0x05",name:"PSBT_GLOBAL_OUTPUT_COUNT",req:true,color:C.green,kd:"None",vd:"Compact size uint",desc:"Number of outputs. Must match output map count. Modifiable during construction.",ex:{k:"05",v:"02",m:"2 outputs"}},
  {key:"0x06",name:"PSBT_GLOBAL_TX_MODIFIABLE",req:false,color:C.cyan,kd:"None",vd:"8-bit flags",desc:"Bit 0 (0x01): inputs modifiable. Bit 1 (0x02): outputs modifiable. Bit 2 (0x04): has SIGHASH_SINGLE.\n\nCritical for CoinJoin/PayJoin. Coordinator sets to 0x03 during registration, clears to 0x00 before signing. If absent → not modifiable.",ex:{k:"06",v:"03",m:"Inputs + outputs modifiable"}},
];

const V2_INPUT = [
  {key:"0x0e",name:"PSBT_IN_PREVIOUS_TXID",req:true,color:C.amber,kd:"None",vd:"32-byte txid (internal byte order)",desc:"Replaces the unsigned tx's input prevout. Because it's standalone, inputs can be added/removed without re-serializing — the core v2 motivation.",ex:{k:"0e",v:"7b1eabe0...a14f3f",m:"Previous TXID (32 bytes)"}},
  {key:"0x0f",name:"PSBT_IN_OUTPUT_INDEX",req:true,color:C.amber,kd:"None",vd:"32-bit LE uint",desc:"Index of the output being spent (the \"vout\"). With PREVIOUS_TXID, uniquely identifies the UTXO.",ex:{k:"0f",v:"00000000",m:"vout: 0"}},
  {key:"0x10",name:"PSBT_IN_SEQUENCE",req:false,color:C.orange,kd:"None",vd:"32-bit LE uint",desc:"Sequence number. Default 0xFFFFFFFF. Values: 0xFFFFFFFF = final, no RBF. 0xFFFFFFFE = nLockTime enabled. < 0xFFFFFFFE = BIP-125 RBF. Lower 16 bits may encode relative lock-time.",ex:{k:"10",v:"feffffff",m:"0xFFFFFFFE (nLockTime, no RBF)"}},
  {key:"0x11",name:"PSBT_IN_REQUIRED_TIME_LOCKTIME",req:false,color:C.purple,kd:"None",vd:"32-bit LE uint (≥500M)",desc:"Time-based locktime for this input (Unix timestamp ≥ 500,000,000). Finalizer ensures tx nLockTime ≥ this. Max across all inputs wins.",ex:{k:"11",v:"80d1f008",m:"Timestamp: 1672531200"}},
  {key:"0x12",name:"PSBT_IN_REQUIRED_HEIGHT_LOCKTIME",req:false,color:C.purple,kd:"None",vd:"32-bit LE uint (<500M)",desc:"Block-height locktime (<500,000,000). A tx can only have one locktime type — mixing time and height across inputs makes the PSBT invalid.",ex:{k:"12",v:"40420f00",m:"Block height: 1,000,000"}},
];

const V2_OUTPUT = [
  {key:"0x03",name:"PSBT_OUT_AMOUNT",req:true,color:C.green,kd:"None",vd:"64-bit LE signed int (sats)",desc:"Output amount in satoshis. Standalone field enables dynamic output addition/removal by Constructors. Max: 2,100,000,000,000,000 (21M BTC).",ex:{k:"03",v:"e803000000000000",m:"1,000 sats"}},
  {key:"0x04",name:"PSBT_OUT_SCRIPT",req:true,color:C.blue,kd:"None",vd:"scriptPubKey bytes",desc:"The locking script. P2PKH: 25 bytes (OP_DUP OP_HASH160...). P2SH: 23 bytes. P2WPKH: 22 bytes (0014...). P2WSH: 34 bytes (0020...). P2TR: 34 bytes (5120...). The \"address\" is just an encoding of this.",ex:{k:"04",v:"160014d85c2b71...124d",m:"P2WPKH script"}},
];

const ROLES = [
  {id:"creator",name:"Creator",icon:"✦",color:C.amber,short:"Initializes the PSBT structure",full:"In v0: creates unsigned tx (empty scriptSigs, no witnesses) wrapped in PSBT format. In v2: sets global fields (version, tx_version, counts) and per-input/per-output maps.\n\nNeeds to know which UTXOs to spend and destinations, but NOT private keys. Often the same software as the Updater (e.g., watch-only wallet).",produces:"PSBT with tx skeleton",consumes:"User intent: UTXOs, destinations, fees"},
  {id:"updater",name:"Updater",icon:"⬆",color:C.blue,short:"Adds UTXO data, scripts, derivation paths",full:"Enriches the PSBT with everything signers need: UTXO info (for sighash + amount verification), scripts (for spending conditions), BIP32 paths (for key location).\n\nNo private keys needed — works with public data. Common pattern: watch-only wallet = Creator + Updater, hands to hardware wallet (Signer). In v2, extended by the Constructor role.",produces:"Enriched PSBT",consumes:"PSBT + UTXO database + pubkey material"},
  {id:"signer",name:"Signer",icon:"✍",color:C.green,short:"Produces partial signatures with private keys",full:"The ONLY role needing private keys. For each signable input:\n1. Determine script type from UTXO + scripts\n2. Compute sighash (BIP-143 for SegWit)\n3. Sign with ECDSA/Schnorr\n4. Store as PARTIAL_SIG\n\nMUST reject if: unknown version, sighash fails, unreasonable fee, malformed PSBT. Hardware wallets display tx details on secure screen before signing.",produces:"PSBT with partial sigs",consumes:"Enriched PSBT + private keys"},
  {id:"combiner",name:"Combiner",icon:"⊕",color:C.purple,short:"Merges PSBTs with different signatures",full:"Takes 2+ PSBTs for the same tx with different sigs and unions their key-value pairs. Same key in multiple PSBTs → values MUST be identical. Different-pubkey PARTIAL_SIGs merge naturally.\n\nPerforms NO validation (that's the Finalizer). Essential for geographically separated multisig co-signers.",produces:"Single merged PSBT",consumes:"2+ PSBTs for same tx"},
  {id:"finalizer",name:"Finalizer",icon:"◉",color:C.orange,short:"Builds final scriptSig/scriptWitness",full:"Converts partial sigs into spending proofs:\n\n• P2PKH: scriptSig = <sig> <pubkey>\n• P2WPKH: witness = [<sig>, <pubkey>]\n• P2SH-P2WPKH: scriptSig = <redeemScript>, witness = [<sig>, <pubkey>]\n• P2WSH multisig: witness = [OP_0, <sig1>, <sig2>, <witnessScript>]\n\nStrips all non-final fields. Irreversible — must understand Bitcoin Script.",produces:"Finalized PSBT",consumes:"PSBT with sufficient sigs"},
  {id:"extractor",name:"Extractor",icon:"→",color:C.cyan,short:"Produces broadcast-ready transaction",full:"Final role. Verifies all inputs finalized, takes unsigned tx (v0) or reconstructs from decomposed fields (v2), inserts FINAL_SCRIPTSIG and FINAL_SCRIPTWITNESS, serializes complete signed transaction.\n\nOutput = raw tx hex for sendrawtransaction RPC or block explorer broadcast. PSBT can then be discarded.",produces:"Raw signed tx (hex)",consumes:"Fully finalized PSBT"},
];

const DIFFS = [
  {a:"Transaction Data",color:C.amber,v0:"Complete unsigned tx in PSBT_GLOBAL_UNSIGNED_TX — one serialized blob.",v2:"No unsigned tx. Decomposed: tx_version, input_count, output_count globally; previous_txid, output_index per input; amount, script per output.",why:"Decomposition enables add/remove of inputs and outputs — essential for CoinJoin, PayJoin, interactive protocols."},
  {a:"Input Identification",color:C.green,v0:"By position index in the unsigned tx's input array.",v2:"Explicit PSBT_IN_PREVIOUS_TXID + OUTPUT_INDEX per input map.",why:"Self-contained refs enable reordering, adding, removing without breaking index correspondence."},
  {a:"Output Definition",color:C.blue,v0:"Defined in unsigned tx. Output maps add supplementary metadata.",v2:"PSBT_OUT_AMOUNT + PSBT_OUT_SCRIPT per output map. Definition and metadata together.",why:"Self-contained outputs enable incremental construction by CoinJoin coordinators."},
  {a:"Modifiability",color:C.orange,v0:"Fixed once Creator builds unsigned tx. Updater adds metadata only.",v2:"TX_MODIFIABLE flags: bit 0 = inputs, bit 1 = outputs. Constructors modify until cleared.",why:"Primary v2 motivation — multi-party protocols need collaborative building before signing."},
  {a:"Locktime",color:C.purple,v0:"Single nLockTime in unsigned tx, shared by all inputs.",v2:"Per-input REQUIRED_TIME/HEIGHT_LOCKTIME + GLOBAL_FALLBACK. Finalizer takes max.",why:"Different participants can impose different time constraints."},
  {a:"Roles",color:C.cyan,v0:"Creator → Updater → Signer → Combiner → Finalizer → Extractor.",v2:"Same + Constructor role between Creator and Signer for modification phase.",why:"Formalizes the multi-party construction phase impossible in v0."},
  {a:"Version Field",color:C.red,v0:"Optional. Absent = version 0.",v2:"Required, must be 2.",why:"Prevents parsers from misinterpreting v2-specific fields."},
  {a:"Backward Compat",color:C.teal,v0:"Universal — all PSBT wallets understand v0.",v2:"Can downconvert to v0 by reconstructing unsigned tx from decomposed fields.",why:"Ensures v2 PSBTs work with v0-only software after conversion."},
];


// ━━━ UTILITY COMPONENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Badge = ({children,color=C.amber,small}) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:small?"1px 7px":"3px 10px",borderRadius:4,fontSize:small?10:11,fontWeight:700,background:color+"15",color,border:`1px solid ${color}35`,letterSpacing:"0.03em",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>{children}</span>
);
const Mono = ({children,color=C.text,sz=12}) => (
  <code style={{fontFamily:"'JetBrains Mono',monospace",fontSize:sz,color,wordBreak:"break-all"}}>{children}</code>
);
const Card = ({children,style={}}) => (
  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:24,...style}}>{children}</div>
);
const Head = ({children,icon,color=C.amber,sub}) => (
  <div style={{marginBottom:18}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      {icon&&<span style={{fontSize:22}}>{icon}</span>}
      <h3 style={{margin:0,fontSize:18,fontWeight:800,color,letterSpacing:"-0.01em"}}>{children}</h3>
    </div>
    {sub&&<p style={{margin:"6px 0 0 32px",fontSize:13,color:C.soft,lineHeight:1.7}}>{sub}</p>}
  </div>
);
const InfoBox = ({color=C.cyan,children,icon="•"}) => (
  <div style={{padding:"14px 18px",borderRadius:10,background:color+"08",border:`1px solid ${color}25`,fontSize:13,color:C.soft,lineHeight:1.75,marginTop:12}}>
    <span style={{marginRight:8}}>{icon}</span>{children}
  </div>
);

// ━━━ HEX VIEWER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function HexViewer({hex,sections}) {
  const [hov,setHov] = useState(null);
  const bytes = useMemo(() => hex.replace(/\s/g,"").match(/.{1,2}/g)||[], [hex]);
  const bmap = useMemo(() => {
    const m = new Array(bytes.length).fill(null);
    if(sections) sections.forEach(s => { for(let i=s.start;i<Math.min(s.end,bytes.length);i++) m[i]=s; });
    return m;
  }, [bytes,sections]);
  return (
    <div>
      <div style={{background:"#050910",borderRadius:10,padding:16,border:`1px solid ${C.border}`,lineHeight:2.1,overflowX:"auto"}}>
        {bytes.map((b,i) => {
          const s=bmap[i]; const hi=hov&&s&&s.id===hov;
          return <span key={i} onMouseEnter={()=>s&&setHov(s.id)} onMouseLeave={()=>setHov(null)} style={{
            display:"inline-block",padding:"1px 3px",margin:"1px",fontFamily:"'JetBrains Mono',monospace",fontSize:11.5,
            color:hi?"#fff":(s?s.color:C.dim),background:hi?s.color+"35":(s?s.color+"0a":"transparent"),
            borderRadius:3,cursor:s?"pointer":"default",borderBottom:`2px solid ${s?s.color+(hi?"90":"40"):"transparent"}`,transition:"all 0.12s",
          }}>{b}</span>;
        })}
      </div>
      {sections&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
        {sections.map(s=><div key={s.id} onMouseEnter={()=>setHov(s.id)} onMouseLeave={()=>setHov(null)} style={{
          display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:6,cursor:"pointer",
          background:hov===s.id?s.color+"18":"transparent",border:`1px solid ${hov===s.id?s.color+"40":"transparent"}`,transition:"all 0.15s",
        }}>
          <span style={{width:10,height:10,borderRadius:3,background:s.color,flexShrink:0}}/>
          <span style={{fontSize:11.5,color:hov===s.id?s.color:C.soft,fontWeight:600}}>{s.label}</span>
          <span style={{fontSize:10,color:C.dim}}>({s.end-s.start}b)</span>
        </div>)}
      </div>}
    </div>
  );
}

// ━━━ FIELD CARD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function FieldCard({f,open,toggle}) {
  return (
    <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${open?f.color+"50":C.border}`,background:open?C.cardHi:C.card,transition:"all 0.25s"}}>
      <div onClick={toggle} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer"}}>
        <Badge color={f.color} small>{f.key}</Badge>
        <span style={{fontSize:12.5,fontWeight:700,color:f.color,fontFamily:"'JetBrains Mono',monospace",flex:1}}>{f.name}</span>
        {f.req&&<Badge color={C.red} small>REQUIRED</Badge>}
        <span style={{fontSize:18,color:C.dim,transform:open?"rotate(180deg)":"rotate(0)",transition:"transform 0.25s"}}>▾</span>
      </div>
      {open&&<div style={{padding:"0 16px 18px",animation:"fadeIn 0.2s ease"}}>
        <div style={{height:1,background:C.border,margin:"0 0 14px"}}/>
        <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:"8px 12px",marginBottom:14}}>
          <span style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.06em"}}>Key data</span>
          <span style={{fontSize:12,color:C.orange}}>{f.kd}</span>
          <span style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.06em"}}>Value</span>
          <span style={{fontSize:12,color:C.green}}>{f.vd}</span>
        </div>
        <div style={{fontSize:13,color:C.soft,lineHeight:1.85,whiteSpace:"pre-line"}}>{f.desc}</div>
        {f.ex&&<div style={{marginTop:14,padding:"12px 16px",borderRadius:8,background:"#060a10",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Example encoding</div>
          <div style={{display:"grid",gridTemplateColumns:"55px 1fr",gap:"4px 10px"}}>
            <Mono color={C.dim} sz={11}>Key</Mono><Mono color={C.orange} sz={11}>{f.ex.k}</Mono>
            <Mono color={C.dim} sz={11}>Value</Mono><Mono color={C.green} sz={11}>{f.ex.v}</Mono>
            <Mono color={C.dim} sz={11}>Means</Mono><span style={{fontSize:11.5,color:C.cyan}}>{f.ex.m}</span>
          </div>
        </div>}
      </div>}
    </div>
  );
}
function FieldTable({fields,title,icon}) {
  const [open,setOpen] = useState(null);
  return (<div><Head icon={icon} color={C.amber}>{title}</Head>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {fields.map((f,i)=><FieldCard key={i} f={f} open={open===i} toggle={()=>setOpen(open===i?null:i)}/>)}
    </div></div>);
}

// ━━━ ROLE FLOW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function RoleFlow() {
  const [sel,setSel] = useState(null);
  const r = sel!==null ? ROLES[sel] : null;
  return (<div>
    <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:6,padding:"8px 0 12px"}}>
      {ROLES.map((ro,i)=>(<div key={ro.id} style={{display:"flex",alignItems:"center"}}>
        <div onClick={()=>setSel(sel===i?null:i)} style={{
          display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"14px 14px",borderRadius:12,cursor:"pointer",
          background:sel===i?ro.color+"14":C.surface,border:`2px solid ${sel===i?ro.color:C.border}`,
          transition:"all 0.25s",minWidth:84,transform:sel===i?"translateY(-4px) scale(1.04)":"none",
          boxShadow:sel===i?`0 8px 24px ${ro.color}15`:"none",
        }}>
          <span style={{fontSize:24}}>{ro.icon}</span>
          <span style={{fontSize:11.5,fontWeight:800,color:ro.color}}>{ro.name}</span>
        </div>
        {i<ROLES.length-1&&<svg width="24" height="14" viewBox="0 0 24 14" style={{flexShrink:0,margin:"0 2px"}}><path d="M1 7 L17 7 M13 2 L19 7 L13 12" stroke={C.dim} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>))}
    </div>
    {r&&<div style={{marginTop:8,padding:20,borderRadius:12,background:C.cardHi,border:`1px solid ${r.color}30`,animation:"fadeIn 0.2s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <span style={{fontSize:28}}>{r.icon}</span>
        <div><div style={{fontSize:16,fontWeight:800,color:r.color}}>{r.name}</div><div style={{fontSize:12,color:C.dim}}>{r.short}</div></div>
      </div>
      <div style={{fontSize:13,color:C.soft,lineHeight:1.85,whiteSpace:"pre-line"}}>{r.full}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:16}}>
        <div style={{padding:"10px 14px",borderRadius:8,background:C.green+"0a",border:`1px solid ${C.green}20`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Produces</div>
          <div style={{fontSize:12,color:C.soft}}>{r.produces}</div>
        </div>
        <div style={{padding:"10px 14px",borderRadius:8,background:C.blue+"0a",border:`1px solid ${C.blue}20`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Consumes</div>
          <div style={{fontSize:12,color:C.soft}}>{r.consumes}</div>
        </div>
      </div>
    </div>}
  </div>);
}

// ━━━ SCENARIO WALKTHROUGH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Scenarios() {
  const [si,setSi] = useState(0);
  const [stage,setStage] = useState(0);
  const s = SCENARIOS[si];
  useEffect(()=>setStage(0),[si]);
  const st = s.stages[stage];
  return (<div style={{display:"flex",flexDirection:"column",gap:20}}>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {SCENARIOS.map((sc,i)=>(<button key={sc.id} onClick={()=>setSi(i)} style={{
        padding:"10px 16px",borderRadius:10,border:`2px solid ${si===i?sc.color:C.border}`,
        background:si===i?sc.color+"12":C.surface,cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all 0.2s",fontFamily:"inherit",
      }}><span style={{fontSize:20}}>{sc.emoji}</span><span style={{fontSize:13,fontWeight:700,color:si===i?sc.color:C.dim}}>{sc.title}</span></button>))}
    </div>
    <Card style={{background:s.color+"06",borderColor:s.color+"25"}}>
      <div style={{fontSize:15,fontWeight:800,color:s.color,marginBottom:8}}>{s.emoji} {s.title}</div>
      <p style={{margin:"0 0 16px",fontSize:13,color:C.soft,lineHeight:1.85}}>{s.summary}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"start"}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:C.orange,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Inputs</div>
          {s.inputs.map((inp,i)=>(<div key={i} style={{padding:"10px 12px",borderRadius:8,marginBottom:4,background:"#060a10",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.orange,marginBottom:4}}>{inp.label}</div>
            <Mono sz={10} color={C.dim}>{inp.txid.slice(0,16)}...:{inp.vout}</Mono>
            <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
              <Badge color={C.amber} small>{inp.amount.toLocaleString()} sats</Badge>
              <Badge color={C.purple} small>{inp.type}</Badge>
              {inp.path&&<Badge color={C.blue} small>{inp.path}</Badge>}
            </div>
          </div>))}
        </div>
        <div style={{display:"flex",alignItems:"center",paddingTop:30}}>
          <svg width="36" height="20" viewBox="0 0 36 20"><path d="M2 10 L28 10 M24 4 L30 10 L24 16" stroke={C.dim} strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Outputs</div>
          {s.outputs.map((out,i)=>(<div key={i} style={{padding:"10px 12px",borderRadius:8,marginBottom:4,background:"#060a10",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.blue,marginBottom:4}}>{out.label}</div>
            <Mono sz={10} color={C.dim}>{out.addr.slice(0,24)}...</Mono>
            <div style={{marginTop:4}}><Badge color={C.green} small>{out.amount.toLocaleString()} sats</Badge></div>
          </div>))}
          <div style={{marginTop:4,textAlign:"right"}}><Badge color={C.red} small>Fee: {s.fee} sats</Badge></div>
        </div>
      </div>
    </Card>
    <Card>
      <div style={{fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Step-by-step PSBT lifecycle — click any stage</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
        {s.stages.map((stg,i)=>(<button key={i} onClick={()=>setStage(i)} style={{
          padding:"7px 14px",borderRadius:8,border:`1.5px solid ${stage===i?stg.color:C.border}`,
          background:stage===i?stg.color+"15":"transparent",color:stage===i?stg.color:C.dim,
          fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.2s",fontFamily:"inherit",
        }}>{i+1}. {stg.role}</button>))}
      </div>
      <div style={{padding:20,borderRadius:10,background:st.color+"06",border:`1.5px solid ${st.color}30`,minHeight:200}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:st.color+"20",fontSize:14,fontWeight:900,color:st.color}}>{stage+1}</div>
          <div><div style={{fontSize:15,fontWeight:800,color:st.color}}>{st.role}</div><div style={{fontSize:11,color:C.dim}}>Stage {stage+1} of {s.stages.length}</div></div>
        </div>
        <div style={{fontSize:13,color:C.soft,lineHeight:1.9,whiteSpace:"pre-line"}}>{st.text}</div>
        {st.fields.length>0&&<div style={{marginTop:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>PSBT fields touched</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{st.fields.map((f,i)=><Badge key={i} color={st.color}>{f}</Badge>)}</div>
        </div>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
        <button onClick={()=>setStage(Math.max(0,stage-1))} disabled={stage===0} style={{
          padding:"8px 18px",borderRadius:8,fontWeight:700,fontSize:12,cursor:stage===0?"default":"pointer",
          background:"transparent",border:`1.5px solid ${stage===0?C.border:C.dim}`,color:stage===0?C.dim:C.text,fontFamily:"inherit",
        }}>← Previous</button>
        <button onClick={()=>setStage(Math.min(s.stages.length-1,stage+1))} disabled={stage===s.stages.length-1} style={{
          padding:"8px 18px",borderRadius:8,fontWeight:700,fontSize:12,
          cursor:stage===s.stages.length-1?"default":"pointer",
          background:stage===s.stages.length-1?C.border:st.color,border:"none",color:stage===s.stages.length-1?C.dim:"#000",fontFamily:"inherit",
        }}>Next Stage →</button>
      </div>
    </Card>
  </div>);
}

// ━━━ STRUCTURE VISUALIZER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Structure({version}) {
  const [sel,setSel] = useState(null);
  const L = version===2 ? [
    {id:"magic",label:"Magic Bytes",bytes:"70 73 62 74 ff",d:"ASCII \"psbt\" + 0xFF separator. Every PSBT starts with these 5 bytes. 0xFF can't be confused with a valid compact-size key-length, so it unambiguously marks the start of data.",color:C.red,w:1},
    {id:"global",label:"Global Map (v2)",d:"PSBT_GLOBAL_VERSION (=2), TX_VERSION, INPUT_COUNT, OUTPUT_COUNT, optionally FALLBACK_LOCKTIME and TX_MODIFIABLE. UNSIGNED_TX is NOT present \u2014 tx data is decomposed into per-input and per-output fields.",color:C.amber,w:1},
    {id:"sep0",label:"0x00 Separator",bytes:"00",d:"A single zero byte terminates the global map. The parser reads key-value pairs in a loop; when it encounters a key-length of 0x00, there's no valid key that short, so it knows the map is done. It then advances to the first input map. This same 0x00 byte terminates EVERY map in the PSBT \u2014 it's the universal \"end of map\" signal. Without separators, the parser couldn't know where one map ends and the next begins, since maps have variable numbers of KV pairs.",color:C.dim,w:1},
    {id:"in0",label:"Input 0 Map",d:"PREVIOUS_TXID + OUTPUT_INDEX (required), plus SEQUENCE, WITNESS_UTXO, BIP32_DERIVATION, scripts, sigs, locktime fields.",color:C.green,w:.48},
    {id:"sep1",label:"0x00 Separator",bytes:"00",d:"Terminates Input 0 Map. Parser now expects the next input map (Input 1) if more inputs remain, or the first output map if all inputs are done. The parser knows how many inputs to expect from GLOBAL_INPUT_COUNT.",color:C.dim,w:.48},
    {id:"inN",label:"Input N Map",d:"Same structure. Count must equal GLOBAL_INPUT_COUNT. Each input map is terminated by its own 0x00 separator. Appendable during construction.",color:C.green,w:.48},
    {id:"sepN",label:"0x00 Separator",bytes:"00",d:"Terminates the last input map. Parser transitions from input maps to output maps.",color:C.dim,w:.48},
    {id:"out0",label:"Output 0 Map",d:"AMOUNT + SCRIPT (required), plus optional REDEEM_SCRIPT, WITNESS_SCRIPT, BIP32_DERIVATION.",color:C.blue,w:.48},
    {id:"sep2",label:"0x00 Separator",bytes:"00",d:"Terminates Output 0 Map. Next output follows, or PSBT ends after the last output's separator.",color:C.dim,w:.48},
    {id:"outN",label:"Output N Map",d:"Same. Count must match GLOBAL_OUTPUT_COUNT. The 0x00 after the final output map is the last byte of the PSBT.",color:C.blue,w:.48},
    {id:"sep3",label:"0x00 (EOF)",bytes:"00",d:"Final separator. After this byte, the PSBT is complete. There is no explicit \"end of PSBT\" marker \u2014 the last output map's separator IS the end. A parser that has consumed all expected input and output maps stops here.",color:C.dim,w:.48},
  ] : [
    {id:"magic",label:"Magic Bytes",bytes:"70 73 62 74 ff",d:"ASCII \"psbt\" + 0xFF separator. Every valid PSBT begins with these 5 bytes for format identification.",color:C.red,w:1},
    {id:"global",label:"Global Map (v0)",d:"Key entry: PSBT_GLOBAL_UNSIGNED_TX \u2014 complete unsigned tx with empty scriptSigs, no witness. Also XPUB entries and VERSION. This is where the tx structure lives in v0.",color:C.amber,w:1},
    {id:"sep0",label:"0x00 Separator",bytes:"00",d:"Terminates the global map. The parser reads KV pairs in a loop: read compact-size key-length, if 0x00 \u2192 map is done, advance. This is the ONLY way to know a map has ended \u2014 there's no count of KV pairs. The 0x00 byte works because a valid key must have at least 1 byte (the type byte), so key-length=0 is unambiguous.\n\nAfter this separator, the parser expects Input 0 Map. In v0, the number of input maps equals the number of inputs in the unsigned tx.",color:C.dim,w:1},
    {id:"in0",label:"Input 0 Map",d:"WITNESS_UTXO or NON_WITNESS_UTXO, BIP32_DERIVATION, then PARTIAL_SIG after signing or FINAL_SCRIPTSIG/FINAL_SCRIPTWITNESS after finalization. Index = position in unsigned tx.",color:C.green,w:.48},
    {id:"sep1",label:"0x00 Separator",bytes:"00",d:"Terminates Input 0 Map. Parser moves to Input 1 (or Output 0 if only 1 input). Critical: even an empty input map (no KV pairs) still needs this 0x00 \u2014 it's just a bare separator byte.",color:C.dim,w:.48},
    {id:"inN",label:"Input N Map",d:"One per input in the unsigned tx. Even empty ones need their own 0x00 separator \u2014 the positional correspondence with unsigned tx inputs must be preserved.",color:C.green,w:.48},
    {id:"sepN",label:"0x00 Separator",bytes:"00",d:"Terminates the last input map. Parser transitions to output maps.",color:C.dim,w:.48},
    {id:"out0",label:"Output 0 Map",d:"Often empty for payment outputs. Change outputs get BIP32_DERIVATION. May have REDEEM_SCRIPT or WITNESS_SCRIPT.",color:C.blue,w:.48},
    {id:"sep2",label:"0x00 Separator",bytes:"00",d:"Terminates Output 0 Map.",color:C.dim,w:.48},
    {id:"outN",label:"Output N Map",d:"One per output. Count must match unsigned tx outputs. Even empty output maps need the 0x00 separator.",color:C.blue,w:.48},
    {id:"sep3",label:"0x00 (EOF)",bytes:"00",d:"Final byte of the PSBT. The separator after the last output map signals completion. A v0 parser verifies: global map count = 1, input map count = unsigned tx input count, output map count = unsigned tx output count.",color:C.dim,w:.48},
  ];
  return (<div style={{display:"flex",flexDirection:"column",gap:6}}>
    {L.map((l,i) => {
      const half = l.w<1;
      if(half && i>0 && L[i-1].w<1) return null;
      if(half) {
        const pair=[l,L[i+1]].filter(Boolean);
        return <div key={i} style={{display:"flex",gap:6}}>{pair.map(p=>(
          <div key={p.id} onClick={()=>setSel(sel===p.id?null:p.id)} style={{
            flex:1,padding:"14px 16px",borderRadius:10,cursor:"pointer",
            background:sel===p.id?p.color+"10":C.surface,border:`2px solid ${sel===p.id?p.color:C.border}`,transition:"all 0.2s",
          }}><div style={{fontSize:12.5,fontWeight:800,color:p.color}}>{p.label}</div>
            {sel===p.id&&<p style={{margin:"10px 0 0",fontSize:12.5,color:C.soft,lineHeight:1.8}}>{p.d}</p>}
          </div>))}</div>;
      }
      return (<div key={i} onClick={()=>setSel(sel===l.id?null:l.id)} style={{
        padding:"14px 16px",borderRadius:10,cursor:"pointer",
        background:sel===l.id?l.color+"10":C.surface,border:`2px solid ${sel===l.id?l.color:C.border}`,transition:"all 0.2s",
      }}><div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12.5,fontWeight:800,color:l.color}}>{l.label}</span>
          {l.bytes&&<Mono color={C.dim} sz={11}>{l.bytes}</Mono>}
        </div>
        {sel===l.id&&<p style={{margin:"10px 0 0",fontSize:12.5,color:C.soft,lineHeight:1.8}}>{l.d}</p>}
      </div>);
    })}
  </div>);
}

// ━━━ KV ENCODING EXPLAINER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function KVEncoding() {
  const [ex,setEx] = useState(0);
  const EX = [
    {t:"Unsigned TX (Global 0x00)",color:C.amber,rows:[
      {l:"Key length",v:"01",m:"1 byte of key data follows",c:C.purple},
      {l:"Key type",v:"00",m:"Type 0x00 = PSBT_GLOBAL_UNSIGNED_TX",c:C.amber},
      {l:"Value length",v:"52",m:"82 bytes of value data (compact-size)",c:C.purple},
      {l:"Value",v:"0200000001aad739...00000000",m:"Full unsigned tx (version 2, 1 input, 2 outputs, locktime 0)",c:C.green},
    ]},
    {t:"Witness UTXO (Input 0x01)",color:C.green,rows:[
      {l:"Key length",v:"01",m:"1 byte key data",c:C.purple},
      {l:"Key type",v:"01",m:"Type 0x01 = PSBT_IN_WITNESS_UTXO",c:C.green},
      {l:"Value length",v:"1a",m:"26 bytes (8B amount + 18B script)",c:C.purple},
      {l:"Amount",v:"a086010000000000",m:"100,000 satoshis (64-bit little-endian)",c:C.amber},
      {l:"scriptPubKey",v:"160014d85c...124d",m:"P2WPKH: OP_0 + PUSH20 + pubkey hash",c:C.blue},
    ]},
    {t:"BIP32 Derivation (Input 0x06)",color:C.amber,rows:[
      {l:"Key length",v:"22",m:"34 bytes: 1 type + 33 compressed pubkey",c:C.purple},
      {l:"Key type",v:"06",m:"Type 0x06 = PSBT_IN_BIP32_DERIVATION",c:C.amber},
      {l:"Pubkey",v:"0279be667e...f81798",m:"33-byte compressed public key",c:C.orange},
      {l:"Val length",v:"18",m:"24 bytes: 4B fingerprint + 5×4B path",c:C.purple},
      {l:"Fingerprint",v:"d90c6a4f",m:"First 4 bytes of Hash160(master pubkey)",c:C.cyan},
      {l:"Path",v:"54000080 00000080 00000080 00000000 07000000",m:"m/84'/0'/0'/0/7 (0x80 prefix = hardened)",c:C.blue},
    ]},
    {t:"Map Separator (0x00)",color:C.dim,rows:[
      {l:"Byte",v:"00",m:"Key-length = 0. Since a valid key needs \u22651 byte (the type), 0x00 can only mean: end of map.",c:C.dim},
      {l:"Why it works",v:"\u2014",m:"The parser loop: read key-len \u2192 if 0 \u2192 map done. Otherwise read key, val-len, val, repeat. 0x00 is unambiguous.",c:C.cyan},
      {l:"Empty map",v:"00",m:"A map with zero KV pairs is just a bare 0x00. Common for empty input/output maps (e.g. Creator stage).",c:C.orange},
      {l:"Ordering",v:"global \u2192 inputs \u2192 outputs",m:"After global's 0x00: input 0 map ... 0x00, input 1 map ... 0x00, ..., output 0 map ... 0x00, ..., final 0x00 = EOF.",c:C.green},
      {l:"Count check",v:"v0: from unsigned tx",m:"v0: parser knows input/output count from unsigned tx. v2: from GLOBAL_INPUT_COUNT / OUTPUT_COUNT fields.",c:C.purple},
    ]},
  ];
  const e = EX[ex];
  return (<div>
    <Head icon="A̲" color={C.purple}>Key-Value Encoding</Head>
    <p style={{fontSize:13,color:C.soft,lineHeight:1.85,margin:"0 0 16px"}}>
      Every PSBT map is a sequence of key-value pairs: compact-size key length, key bytes (type + optional data), compact-size value length, value bytes. A bare <strong style={{color:C.amber}}>0x00</strong> byte ends each map — it acts as the separator between maps. The parser reads in a loop: peek at key-length, if it's 0x00 the map is done, otherwise read the full KV pair. This is the only delimiter — there is no pair count, no map length header. The entire PSBT is: magic, global map, 0x00, input maps (each followed by 0x00), output maps (each followed by 0x00).
    </p>
    <div style={{display:"flex",gap:6,alignItems:"stretch",justifyContent:"center",padding:"20px 14px",background:"#050910",borderRadius:12,border:`1px solid ${C.border}`,marginBottom:16,flexWrap:"wrap"}}>
      {[{l:"key-len",s:"compact size",c:C.purple},{l:"key-type",s:"1 byte",c:C.amber},{l:"key-data",s:"0+ bytes",c:C.orange},{l:"value-len",s:"compact size",c:C.purple},{l:"value-data",s:"0+ bytes",c:C.green}].map((seg,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{padding:"10px 14px",borderRadius:8,background:seg.c+"12",border:`2px solid ${seg.c}50`,textAlign:"center",minWidth:80}}>
            <div style={{fontSize:12,fontWeight:800,color:seg.c,fontFamily:"'JetBrains Mono',monospace"}}>{seg.l}</div>
            <div style={{fontSize:10,color:C.dim,marginTop:2}}>{seg.s}</div>
          </div>{i<4&&<span style={{color:C.dim,fontSize:14,fontWeight:700}}>+</span>}
        </div>))}
    </div>
    <InfoBox color={C.purple} icon="•">
      <strong style={{color:C.purple}}>Compact-size:</strong> 0-252 → 1 byte. 253-65535 → 0xFD + 2B LE. 65536-4B → 0xFE + 4B LE. Larger → 0xFF + 8B LE. The magic 0xFF at PSBT start can't be a valid compact-size, so it unambiguously marks the boundary.
    </InfoBox>
    <div style={{marginTop:20,display:"flex",gap:6,flexWrap:"wrap"}}>
      {EX.map((eg,i)=>(<button key={i} onClick={()=>setEx(i)} style={{
        padding:"8px 14px",borderRadius:8,border:`1.5px solid ${ex===i?eg.color:C.border}`,
        background:ex===i?eg.color+"12":"transparent",color:ex===i?eg.color:C.dim,
        fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
      }}>{eg.t}</button>))}
    </div>
    <div style={{marginTop:12,padding:20,borderRadius:12,background:"#060a10",border:`1px solid ${e.color}30`}}>
      <div style={{fontSize:14,fontWeight:800,color:e.color,marginBottom:14}}>{e.t}</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {e.rows.map((row,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"100px 180px 1fr",gap:10,alignItems:"baseline",padding:"8px 12px",borderRadius:8,background:row.c+"06",border:`1px solid ${row.c}15`}}>
          <span style={{fontSize:11,fontWeight:700,color:row.c}}>{row.l}</span>
          <Mono sz={11} color={row.c}>{row.v}</Mono>
          <span style={{fontSize:12,color:C.soft,lineHeight:1.6}}>{row.m}</span>
        </div>))}
      </div>
    </div>
  </div>);
}

// ━━━ COMPARISON ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Compare() {
  const [exp,setExp] = useState(null);
  return (<div style={{display:"flex",flexDirection:"column",gap:8}}>
    {DIFFS.map((d,i)=>(<div key={i} onClick={()=>setExp(exp===i?null:i)} style={{
      borderRadius:12,overflow:"hidden",cursor:"pointer",
      border:`1.5px solid ${exp===i?d.color+"50":C.border}`,background:exp===i?C.cardHi:C.card,transition:"all 0.25s",
    }}>
      <div style={{display:"grid",gridTemplateColumns:"120px 1fr 1fr",gap:14,padding:"14px 18px",alignItems:"start"}}>
        <div style={{fontSize:13,fontWeight:800,color:d.color}}>{d.a}</div>
        <div style={{fontSize:12,color:C.dim,lineHeight:1.7}}>
          <span style={{fontSize:10,fontWeight:700,color:C.amber,display:"block",marginBottom:3}}>BIP-174 (v0)</span>{d.v0}
        </div>
        <div style={{fontSize:12,color:C.soft,lineHeight:1.7}}>
          <span style={{fontSize:10,fontWeight:700,color:C.cyan,display:"block",marginBottom:3}}>BIP-370 (v2)</span>{d.v2}
        </div>
      </div>
      {exp===i&&<div style={{padding:"0 18px 16px",animation:"fadeIn 0.2s ease"}}>
        <div style={{padding:"12px 16px",borderRadius:8,background:d.color+"08",border:`1px solid ${d.color}20`}}>
          <span style={{fontSize:10,fontWeight:700,color:d.color,textTransform:"uppercase",letterSpacing:"0.06em"}}>Why the change?</span>
          <p style={{margin:"6px 0 0",fontSize:12.5,color:C.soft,lineHeight:1.75}}>{d.why}</p>
        </div>
      </div>}
    </div>))}
  </div>);
}

// ━━━ UTXO VISUALIZER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UTXOVisualizer({utxos,outputs}) {
  if(!utxos||(!utxos.length&&!outputs?.length)) return null;
  return (<div style={{marginTop:16}}>
    <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Transaction UTXO Map</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"start"}}>
      <div>
        <div style={{fontSize:10,fontWeight:700,color:C.orange,marginBottom:6}}>INPUTS</div>
        {utxos.length===0?<div style={{padding:10,borderRadius:6,background:"#060a10",border:`1px solid ${C.border}`,fontSize:11,color:C.dim}}>No inputs</div>:
        utxos.map((u,i)=>(<div key={i} style={{padding:"8px 10px",borderRadius:6,marginBottom:4,background:"#060a10",border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
            <span style={{fontSize:11,fontWeight:700,color:C.orange}}>{u.label}</span>
            <Badge color={u.status?.includes("✓")?C.green:u.status?.includes("Unsigned")?C.red:C.amber} small>{u.status||"?"}</Badge>
          </div>
          <Mono sz={10} color={C.dim}>{u.txid}:{u.vout}</Mono>
          <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}><Badge color={C.amber} small>{u.amount}</Badge><Badge color={C.purple} small>{u.type}</Badge></div>
        </div>))}
      </div>
      <div style={{display:"flex",alignItems:"center",paddingTop:20}}>
        <svg width="32" height="16" viewBox="0 0 32 16"><path d="M2 8L24 8M20 3L26 8L20 13" stroke={C.dim} strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
      </div>
      <div>
        <div style={{fontSize:10,fontWeight:700,color:C.blue,marginBottom:6}}>OUTPUTS</div>
        {(!outputs||!outputs.length)?<div style={{padding:10,borderRadius:6,background:"#060a10",border:`1px solid ${C.border}`,fontSize:11,color:C.dim}}>No outputs</div>:
        outputs.map((o,i)=>(<div key={i} style={{padding:"8px 10px",borderRadius:6,marginBottom:4,background:"#060a10",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,fontWeight:700,color:C.blue,marginBottom:3}}>{o.label}</div>
          <Mono sz={10} color={C.dim}>{o.addr}</Mono>
          <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}><Badge color={C.green} small>{o.amount}</Badge><Badge color={C.blue} small>{o.type}</Badge></div>
        </div>))}
      </div>
    </div>
  </div>);
}

// ━━━ SERIALIZATION FLOWS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SerializationFlows() {
  const [flowId,setFlowId] = useState("p2wpkh");
  const [step,setStep] = useState(0);
  const flow = FLOWS[flowId];
  const si = Math.min(step, flow.steps.length-1);
  const s = flow.steps[si];
  const changeFlow = (id) => { setFlowId(id); setStep(0); };
  return (<div>
    <Head icon="◇" color={C.amber} sub="Select a script type, then step through byte-level serialization at each PSBT lifecycle stage.">Serialization Flows</Head>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
      {Object.entries(FLOWS).map(([id,fl])=>(<button key={id} onClick={()=>changeFlow(id)} style={{
        padding:"9px 14px",borderRadius:8,border:`2px solid ${flowId===id?fl.color:C.border}`,
        background:flowId===id?fl.color+"12":C.surface,color:flowId===id?fl.color:C.dim,
        fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
        display:"flex",alignItems:"center",gap:6,
      }}><span style={{fontSize:15}}>{fl.emoji}</span>{fl.title}</button>))}
    </div>
    <div style={{padding:"10px 14px",borderRadius:8,background:flow.color+"06",border:`1px solid ${flow.color}20`,marginBottom:14,fontSize:12,color:C.soft,lineHeight:1.6}}>{flow.desc}</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:16}}>
      {flow.steps.map((st,i)=>(<button key={i} onClick={()=>setStep(i)} style={{
        padding:"7px 12px",borderRadius:8,border:`1.5px solid ${si===i?st.color:C.border}`,
        background:si===i?st.color+"15":"transparent",color:si===i?st.color:C.dim,
        fontWeight:700,fontSize:11,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit",
      }}>{i+1}. {st.title}</button>))}
    </div>
    <div style={{padding:20,borderRadius:10,background:s.color+"06",border:`1.5px solid ${s.color}30`,minHeight:160}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <div style={{width:28,height:28,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",background:s.color+"20",fontSize:13,fontWeight:900,color:s.color}}>{si+1}</div>
        <div style={{fontSize:15,fontWeight:800,color:s.color}}>{s.title}</div>
      </div>
      <p style={{margin:"0 0 14px",fontSize:13,color:C.soft,lineHeight:1.85}}>{s.desc}</p>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {s.fields.map((f,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"110px minmax(80px,160px) 1fr",gap:8,alignItems:"baseline",padding:"8px 12px",borderRadius:8,background:f.color+"06",border:`1px solid ${f.color}15`}}>
          <span style={{fontSize:11,fontWeight:700,color:f.color}}>{f.label}</span>
          <Mono sz={10} color={f.color}>{f.hex.length>32?f.hex.slice(0,28)+"...":f.hex}</Mono>
          <span style={{fontSize:11.5,color:C.soft,lineHeight:1.5}}>{f.desc}</span>
        </div>))}
      </div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
      <button onClick={()=>setStep(Math.max(0,si-1))} disabled={si===0} style={{padding:"8px 18px",borderRadius:8,fontWeight:700,fontSize:12,cursor:si===0?"default":"pointer",background:"transparent",border:`1.5px solid ${si===0?C.border:C.dim}`,color:si===0?C.dim:C.text,fontFamily:"inherit"}}>{"←"} Previous</button>
      <span style={{fontSize:11,color:C.dim,alignSelf:"center"}}>{si+1} / {flow.steps.length}</span>
      <button onClick={()=>setStep(Math.min(flow.steps.length-1,si+1))} disabled={si>=flow.steps.length-1} style={{padding:"8px 18px",borderRadius:8,fontWeight:700,fontSize:12,cursor:si>=flow.steps.length-1?"default":"pointer",background:si>=flow.steps.length-1?C.border:s.color,border:"none",color:si>=flow.steps.length-1?C.dim:"#000",fontFamily:"inherit"}}>Next {"→"}</button>
    </div>
  </div>);
}

// ━━━ HEX INSPECTOR (enhanced with role hover + v2 examples) ━━━━━━━

function Inspector() {
  const [selEx,setSelEx] = useState(0);
  const [input,setInput] = useState(PSBT_EXAMPLES[0].hex);
  const [parsed,setParsed] = useState(null);
  const [cat,setCat] = useState("all");
  const curEx = PSBT_EXAMPLES[selEx];

  const filteredExamples = cat==="all"?PSBT_EXAMPLES:PSBT_EXAMPLES.filter(e=>e.cat===cat);
  const loadExample = (ex) => { const idx=PSBT_EXAMPLES.indexOf(ex); setSelEx(idx); setInput(ex.hex); };

  const parse = useCallback((hex) => {
    const cl = hex.replace(/\s/g,"").toLowerCase();
    if(cl.length<10) return null;
    if(!cl.startsWith("70736274ff")) return {error:"Invalid: must start with 70736274ff.",sections:[]};

    const totalBytes = Math.floor(cl.length/2);
    const b = (i)=>parseInt(cl.slice(i*2,i*2+2),16);

    // Compact-size reader: returns [value, bytesConsumed]
    const readCS = (pos)=>{
      if(pos>=totalBytes) return [0,0];
      const f=b(pos);
      if(f<0xfd) return [f,1];
      if(f===0xfd&&pos+2<totalBytes) return [b(pos+1)|(b(pos+2)<<8),3];
      if(f===0xfe&&pos+4<totalBytes) return [b(pos+1)|(b(pos+2)<<8)|(b(pos+3)<<16)|(b(pos+4)<<24)>>>0,5];
      return [0,1];
    };

    // Known field names
    const GNAMES={0x00:"UNSIGNED_TX",0x01:"XPUB",0x02:"TX_VERSION",0x03:"FALLBACK_LOCKTIME",0x04:"INPUT_COUNT",0x05:"OUTPUT_COUNT",0x06:"TX_MODIFIABLE",0xfb:"VERSION",0xfc:"PROPRIETARY"};
    const INAMES={0x00:"NON_WITNESS_UTXO",0x01:"WITNESS_UTXO",0x02:"PARTIAL_SIG",0x03:"SIGHASH_TYPE",0x04:"REDEEM_SCRIPT",0x05:"WITNESS_SCRIPT",0x06:"BIP32_DERIVATION",0x07:"FINAL_SCRIPTSIG",0x08:"FINAL_SCRIPTWITNESS",0x0e:"PREVIOUS_TXID",0x0f:"OUTPUT_INDEX",0x10:"SEQUENCE",0x11:"REQUIRED_TIME_LOCKTIME",0x12:"REQUIRED_HEIGHT_LOCKTIME",0x13:"TAP_KEY_SIG",0x14:"TAP_SCRIPT_SIG",0x15:"TAP_LEAF_SCRIPT",0x16:"TAP_BIP32_DERIVATION",0x17:"TAP_INTERNAL_KEY",0x18:"TAP_MERKLE_ROOT"};
    const ONAMES={0x00:"REDEEM_SCRIPT",0x01:"WITNESS_SCRIPT",0x02:"BIP32_DERIVATION",0x03:"AMOUNT",0x04:"SCRIPT",0x05:"TAP_INTERNAL_KEY",0x06:"TAP_TREE",0x07:"TAP_BIP32_DERIVATION"};

    const mapColors={global:C.amber,inputs:C.green,outputs:C.blue};
    const sections = [{id:"magic",label:"Magic: psbt+0xFF",start:0,end:5,color:C.red}];
    let pos=5,mi=0,phase="global",ic=0,oc=0,fi=0;

    const parseMap = ()=>{
      const mapPhase=phase;
      const mapIdx=phase==="global"?0:phase==="inputs"?ic:oc;
      const prefix=phase==="global"?"Global":phase==="inputs"?"In"+mapIdx:"Out"+mapIdx;
      const names=phase==="global"?GNAMES:phase==="inputs"?INAMES:ONAMES;
      const baseColor=mapColors[phase];

      while(pos<totalBytes){
        // Check for separator
        const kl0=b(pos);
        if(kl0===0x00){
          sections.push({id:"sep"+mi,label:"Separator 0x00",start:pos,end:pos+1,color:C.dim});
          pos++;mi++;
          if(phase==="global") phase="inputs";
          else if(phase==="inputs"){ic++;}
          else{oc++;}
          return true;
        }
        // Read key
        const [keyLen,klSize]=readCS(pos);
        if(keyLen===0||pos+klSize+keyLen>totalBytes) break;
        const keyStart=pos+klSize;
        const keyType=b(keyStart);
        const fieldName=names[keyType]||(keyType<=0x20?"UNKNOWN_0x"+keyType.toString(16).padStart(2,"0"):"PROPRIETARY");

        // Read value
        const valLenPos=keyStart+keyLen;
        if(valLenPos>=totalBytes) break;
        const [valLen,vlSize]=readCS(valLenPos);
        const valStart=valLenPos+vlSize;
        const valEnd=Math.min(valStart+valLen,totalBytes);

        // Key section (key-len + key bytes)
        sections.push({id:"k"+fi,label:prefix+": "+fieldName+" (key)",start:pos,end:valLenPos,color:baseColor,isKey:true,fieldName,keyType,mapPhase});
        // Value section (val-len + value bytes)
        if(valLen>0){
          sections.push({id:"v"+fi,label:prefix+": "+fieldName+" (value)",start:valLenPos,end:valEnd,color:baseColor,isValue:true,fieldName,keyType,mapPhase,valStart,valEnd});
        } else {
          sections.push({id:"v"+fi,label:prefix+": "+fieldName+" (empty value)",start:valLenPos,end:valLenPos+vlSize,color:baseColor,isValue:true,fieldName,keyType,mapPhase,valStart:valLenPos+vlSize,valEnd:valLenPos+vlSize});
        }
        fi++;
        pos=valEnd;
      }
      return false;
    };

    // Parse all maps
    let safety=0;
    while(pos<totalBytes&&safety<500){
      safety++;
      parseMap();
    }

    return {sections,bytes:totalBytes,maps:mi+1,inputs:ic,outputs:oc};
  },[]);

  useEffect(()=>{if(input.trim())setParsed(parse(input));else setParsed(null);},[input,parse]);

  // Build role lookup from current example
  const roleMap = useMemo(()=>{
    if(selEx<0||!PSBT_EXAMPLES[selEx]?.roles) return {};
    return PSBT_EXAMPLES[selEx].roles;
  },[selEx]);

  return (<div style={{display:"flex",flexDirection:"column",gap:18}}>
    <div>
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        {["all","v0","v2"].map(c=>(<button key={c} onClick={()=>setCat(c)} style={{
          padding:"6px 14px",borderRadius:6,border:`1.5px solid ${cat===c?C.amber:C.border}`,
          background:cat===c?C.amber+"12":"transparent",color:cat===c?C.amber:C.dim,
          fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"0.05em",
        }}>{c==="all"?"All Examples":c==="v0"?"BIP-174 (v0)":"BIP-370 (v2)"}</button>))}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
        {filteredExamples.map(ex=>(<button key={ex.id} onClick={()=>loadExample(ex)} style={{
          padding:"7px 12px",borderRadius:8,border:`1.5px solid ${PSBT_EXAMPLES[selEx]===ex?(ex.cat==="v2"?C.cyan:C.green):C.border}`,
          background:PSBT_EXAMPLES[selEx]===ex?(ex.cat==="v2"?C.cyan:C.green)+"12":"transparent",
          color:PSBT_EXAMPLES[selEx]===ex?(ex.cat==="v2"?C.cyan:C.green):C.dim,
          fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",
        }}>{ex.cat==="v2"?"✨ ":""}{ex.label}</button>))}
      </div>
      {curEx?.desc&&<div style={{fontSize:12,color:C.soft,marginBottom:12,lineHeight:1.6,padding:"8px 12px",borderRadius:8,background:(curEx.cat==="v2"?C.cyan:C.green)+"06",border:`1px solid ${curEx.cat==="v2"?C.cyan:C.green}20`}}>{curEx.desc}</div>}
      <textarea value={input} onChange={e=>{setInput(e.target.value);setSelEx(-1);}} placeholder="Paste PSBT hex..." style={{
        width:"100%",height:80,borderRadius:10,padding:14,background:"#050910",color:C.text,border:`1.5px solid ${C.border}`,
        fontFamily:"'JetBrains Mono',monospace",fontSize:11,resize:"vertical",outline:"none",lineHeight:1.7,
      }}/>
    </div>
    {parsed&&!parsed.error&&<div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <Badge color={C.green}>{parsed.bytes} bytes</Badge>
        <Badge color={C.blue}>{parsed.maps} maps</Badge>
        <Badge color={C.amber}>{parsed.inputs} in</Badge>
        <Badge color={C.purple}>{parsed.outputs} out</Badge>
      </div>
      <HexViewerWithRoles hex={input.replace(/\s/g,"").toLowerCase()} sections={parsed.sections} roleMap={roleMap}/>
      {selEx>=0&&(curEx?.utxos?.length>0||curEx?.outputs?.length>0)&&<UTXOVisualizer utxos={curEx.utxos} outputs={curEx.outputs}/>}
    </div>}
    {parsed?.error&&<div style={{padding:16,borderRadius:10,background:"#6b1c1c30",border:`1px solid ${C.red}30`}}>
      <div style={{fontSize:13,color:C.red,fontWeight:700}}>{parsed.error}</div>
    </div>}
  </div>);
}

// ━━━ HEX CONVERSIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OPCODES = {0x00:"OP_0",0x4c:"OP_PUSHDATA1",0x4d:"OP_PUSHDATA2",0x4e:"OP_PUSHDATA4",0x51:"OP_1",0x52:"OP_2",0x53:"OP_3",0x54:"OP_4",0x55:"OP_5",0x56:"OP_6",0x57:"OP_7",0x58:"OP_8",0x59:"OP_9",0x5a:"OP_10",0x5b:"OP_11",0x5c:"OP_12",0x5d:"OP_13",0x5e:"OP_14",0x5f:"OP_15",0x60:"OP_16",0x76:"OP_DUP",0x87:"OP_EQUAL",0x88:"OP_EQUALVERIFY",0xa9:"OP_HASH160",0xac:"OP_CHECKSIG",0xad:"OP_CHECKSIGVERIFY",0xae:"OP_CHECKMULTISIG",0xaf:"OP_CHECKMULTISIGVERIFY",0xba:"OP_CHECKSIGADD"};

function hexConversions(hexBytes) {
  if(!hexBytes||hexBytes.length===0) return [];
  const len = hexBytes.length;
  const out = [];

  // Raw hex
  const rawHex = hexBytes.join(" ");
  if(len<=40) out.push({label:"Hex",value:rawHex,color:C.dim});
  else out.push({label:"Hex",value:hexBytes.slice(0,16).join(" ")+" ... "+hexBytes.slice(-4).join(" ")+" ("+len+" bytes)",color:C.dim});

  // ASCII
  const ascii = hexBytes.map(b=>{const c=parseInt(b,16);return c>=0x20&&c<=0x7e?String.fromCharCode(c):".";}).join("");
  const printable = hexBytes.filter(b=>{const c=parseInt(b,16);return c>=0x20&&c<=0x7e;}).length;
  if(printable>len*0.6&&len<=64) out.push({label:"ASCII",value:ascii,color:C.green});

  // LE uint (up to 8 bytes)
  if(len>=1&&len<=8){
    let val=BigInt(0);
    for(let i=0;i<len;i++) val|=BigInt(parseInt(hexBytes[i],16))<<BigInt(i*8);
    out.push({label:"LE uint"+len*8,value:val.toLocaleString(),color:C.amber});
    // BE uint
    let be=BigInt(0);
    for(let i=0;i<len;i++) be=(be<<BigInt(8))|BigInt(parseInt(hexBytes[i],16));
    if(be!==val) out.push({label:"BE uint"+len*8,value:be.toLocaleString(),color:C.orange});
    // Satoshi → BTC (for 8-byte LE values)
    if(len===8){
      const sats=Number(val);
      out.push({label:"Satoshis",value:sats.toLocaleString()+" sats",color:C.amber});
      out.push({label:"BTC",value:(sats/1e8).toFixed(8)+" BTC",color:C.green});
    }
    // For 4-byte: also show as signed int32
    if(len===4){
      const u32=Number(val);
      const s32=u32>0x7FFFFFFF?u32-0x100000000:u32;
      if(s32!==u32) out.push({label:"LE int32",value:s32.toLocaleString(),color:C.purple});
      // Locktime interpretation
      if(u32>=500000000) out.push({label:"Unix time",value:new Date(u32*1000).toISOString().slice(0,19)+"Z",color:C.cyan});
      else if(u32>0&&u32<500000000) out.push({label:"Block height",value:"#"+u32.toLocaleString(),color:C.cyan});
    }
  }

  // Reversed hex (for 32-byte txids)
  if(len===32){
    const rev=[...hexBytes].reverse().join("");
    out.push({label:"Reversed (display order)",value:rev.slice(0,16)+"..."+rev.slice(-16),color:C.orange});
  }

  // Script decode (for common script sizes)
  if(len>=2&&len<=150){
    const b0=parseInt(hexBytes[0],16);
    const parts=[];
    let pos=0, valid=true, steps=0;
    while(pos<len&&steps<50){
      steps++;
      const op=parseInt(hexBytes[pos],16);
      if(OPCODES[op]!==undefined){parts.push(OPCODES[op]);pos++;continue;}
      if(op>=1&&op<=75){
        const pushLen=op;
        if(pos+1+pushLen>len){valid=false;break;}
        const data=hexBytes.slice(pos+1,pos+1+pushLen).join("");
        parts.push("<"+pushLen+"B:"+data.slice(0,12)+(data.length>12?"...":"")+">");
        pos+=1+pushLen;continue;
      }
      // Unknown opcode or raw data
      valid=false;break;
    }
    if(valid&&parts.length>0&&pos===len){
      out.push({label:"Script",value:parts.join(" "),color:C.blue});
    }
  }

  // Compact-size decode (show what the first byte means as a varint prefix)
  if(len>=1){
    const fb=parseInt(hexBytes[0],16);
    if(len===1&&fb<=252) out.push({label:"Compact-size",value:fb.toString()+" (literal)",color:C.purple});
    else if(fb===0xfd&&len>=3){
      const v=parseInt(hexBytes[1],16)|parseInt(hexBytes[2],16)<<8;
      out.push({label:"Compact-size",value:v.toString()+" (0xFD + 2B LE)",color:C.purple});
    }else if(fb===0xfe&&len>=5){
      const v=parseInt(hexBytes[1],16)|parseInt(hexBytes[2],16)<<8|parseInt(hexBytes[3],16)<<16|parseInt(hexBytes[4],16)<<24;
      out.push({label:"Compact-size",value:(v>>>0).toString()+" (0xFE + 4B LE)",color:C.purple});
    }
  }

  return out;
}

function HexConversionPanel({hexBytes,section,allBytes,color}) {
  // For value sections, decode just the value bytes (skip the length prefix)
  const decodedBytes = useMemo(()=>{
    if(section?.isValue&&section.valStart!==undefined&&section.valEnd!==undefined){
      return allBytes.slice(section.valStart,section.valEnd);
    }
    if(section?.isKey){
      // For keys, skip the key-length prefix and show key bytes
      return hexBytes.length>1?hexBytes.slice(1):hexBytes;
    }
    return hexBytes;
  },[hexBytes,section,allBytes]);

  const conversions = useMemo(()=>hexConversions(decodedBytes),[decodedBytes]);
  if(!conversions.length) return null;
  const sectionLabel = section?.fieldName||section?.label||"";
  const isKey = section?.isKey;
  const isValue = section?.isValue;
  return (
    <div style={{marginTop:8,padding:"12px 16px",borderRadius:10,background:"#050910",border:`1px solid ${color}25`,animation:"fadeIn 0.15s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <div style={{fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.08em"}}>
          {isKey?"Key Decode":isValue?"Value Decode":"Decoded"} {sectionLabel&&<span style={{color,textTransform:"none"}}> \u2014 {sectionLabel}</span>}
        </div>
        {isKey&&section.keyType!==undefined&&<Badge color={color} small>type 0x{section.keyType.toString(16).padStart(2,"0")}</Badge>}
        {decodedBytes.length>0&&<span style={{fontSize:10,color:C.dim,marginLeft:"auto"}}>{decodedBytes.length} bytes</span>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {conversions.map((cv,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:8,alignItems:"baseline",padding:"4px 8px",borderRadius:6,background:cv.color+"06"}}>
            <span style={{fontSize:11,fontWeight:700,color:cv.color,fontFamily:"'JetBrains Mono',monospace"}}>{cv.label}</span>
            <span style={{fontSize:11.5,color:C.soft,fontFamily:"'JetBrains Mono',monospace",wordBreak:"break-all"}}>{cv.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HexViewerWithRoles({hex,sections,roleMap}) {
  const [hov,setHov] = useState(null);
  const bytes = useMemo(() => hex.match(/.{1,2}/g)||[], [hex]);
  const bmap = useMemo(() => {
    const m = new Array(bytes.length).fill(null);
    if(sections) sections.forEach(s => { for(let i=s.start;i<Math.min(s.end,bytes.length);i++) m[i]=s; });
    return m;
  }, [bytes,sections]);
  const hovSection = hov ? sections?.find(s=>s.id===hov) : null;
  // Map field-level labels back to map-level roleMap keys
  const hovRole = useMemo(()=>{
    if(!hovSection||!roleMap) return null;
    // Direct match (for separators or legacy labels)
    if(roleMap[hovSection.label]) return roleMap[hovSection.label];
    // Derive map name from field label: "In0: WITNESS_UTXO (value)" → "Input 0 Map"
    const lbl = hovSection.label;
    if(lbl.startsWith("Global")) return roleMap["Global Map"]||null;
    const inMatch = lbl.match(/^In(\d+):/);
    if(inMatch) return roleMap["Input "+inMatch[1]+" Map"]||null;
    const outMatch = lbl.match(/^Out(\d+):/);
    if(outMatch) return roleMap["Output "+outMatch[1]+" Map"]||null;
    return null;
  },[hovSection,roleMap]);
  const hovBytes = useMemo(()=>{
    if(!hovSection) return null;
    return bytes.slice(hovSection.start,hovSection.end);
  },[hovSection,bytes]);
  return (
    <div>
      <div style={{background:"#050910",borderRadius:10,padding:16,border:`1px solid ${C.border}`,lineHeight:2.1,overflowX:"auto"}}>
        {bytes.map((b,i) => {
          const s=bmap[i]; const hi=hov&&s&&s.id===hov;
          const isKey=s?.isKey;
          return <span key={i} onMouseEnter={()=>s&&setHov(s.id)} onMouseLeave={()=>setHov(null)} style={{
            display:"inline-block",padding:"1px 3px",margin:"1px",fontFamily:"'JetBrains Mono',monospace",fontSize:11.5,
            color:hi?"#fff":(s?s.color:C.dim),opacity:isKey&&!hi?0.55:1,
            background:hi?s.color+"35":(s?s.color+(isKey?"05":"0a"):"transparent"),
            borderRadius:3,cursor:s?"pointer":"default",borderBottom:`2px solid ${s?s.color+(hi?"90":(isKey?"20":"40")):"transparent"}`,transition:"all 0.12s",
          }}>{b}</span>;
        })}
      </div>
      {/* Legend with role annotation on hover */}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
        {sections?.map(s=><div key={s.id} onMouseEnter={()=>setHov(s.id)} onMouseLeave={()=>setHov(null)} style={{
          display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:6,cursor:"pointer",
          background:hov===s.id?s.color+"18":"transparent",border:`1px solid ${hov===s.id?s.color+"40":"transparent"}`,transition:"all 0.15s",
        }}>
          <span style={{width:10,height:10,borderRadius:3,background:s.color,flexShrink:0}}/>
          <span style={{fontSize:11.5,color:hov===s.id?s.color:C.soft,fontWeight:600}}>{s.label}</span>
          <span style={{fontSize:10,color:C.dim}}>({s.end-s.start}b)</span>
        </div>)}
      </div>
      {/* Hex conversion panel */}
      {hovSection&&hovBytes&&<HexConversionPanel hexBytes={hovBytes} section={hovSection} allBytes={bytes} color={hovSection.color}/>}
      {/* Role tooltip — enriched with role breakdown */}
      {hovRole&&(()=>{
        const roleColors = {"Creator":C.amber,"Updater":C.blue,"Signer":C.green,"Combiner":C.purple,"Finalizer":C.orange,"Extractor":C.cyan,"Constructor":C.teal};
        const roleIcons = {"Creator":"✦","Updater":"⬆","Signer":"✍","Combiner":"⊕","Finalizer":"◉","Extractor":"→","Constructor":"⚒"};
        const detectedRoles = [];
        for(const rn of Object.keys(roleColors)){
          if(hovRole.includes(rn)) detectedRoles.push(rn);
        }
        return <div style={{marginTop:8,padding:"12px 16px",borderRadius:10,background:hovSection.color+"08",border:`1px solid ${hovSection.color}30`,animation:"fadeIn 0.15s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:16}}>{hovSection.label.includes("Global")?"⊕":hovSection.label.includes("Input")?"←":hovSection.label.includes("Output")?"→":"⊙"}</span>
            <span style={{fontSize:13,fontWeight:800,color:hovSection.color}}>{hovSection.label}</span>
            <span style={{fontSize:10,color:C.dim,marginLeft:"auto"}}>{hovSection.end-hovSection.start} bytes</span>
          </div>
          {detectedRoles.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
            {detectedRoles.map(rn=><span key={rn} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:(roleColors[rn]||C.dim)+"15",color:roleColors[rn]||C.dim,border:`1px solid ${(roleColors[rn]||C.dim)}30`}}>{roleIcons[rn]||"•"} {rn}</span>)}
          </div>}
          <div style={{fontSize:12,color:C.soft,lineHeight:1.7}}>{hovRole}</div>
        </div>;
      })()}
    </div>
  );
}

// ━━━ MAIN APP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TABS = [
  {id:"overview",label:"Overview",icon:"§"},
  {id:"builder",label:"Build a PSBT",icon:"▶"},
  {id:"scenarios",label:"Scenarios",icon:"○"},
  {id:"structure",label:"Structure",icon:"▣"},
  {id:"fields",label:"Field Maps",icon:"≡"},
  {id:"encoding",label:"Encoding",icon:"A̲"},
  {id:"compare",label:"V0 vs V2",icon:"⇄"},
  {id:"serial",label:"Byte Flows",icon:"◇"},
  {id:"inspector",label:"Inspector",icon:"⊙"},
];

export default function PSBTPlayground() {
  const [tab,setTab] = useState("overview");
  const [bv,setBv] = useState("v0");
  const VerTabs = () => (<div style={{display:"flex",gap:6,marginBottom:20}}>
    <button onClick={()=>setBv("v0")} style={{padding:"9px 20px",borderRadius:8,border:bv==="v0"?"1.5px solid "+C.amber+"50":"1.5px solid transparent",background:bv==="v0"?C.amber+"12":"transparent",color:bv==="v0"?C.amber:C.dim,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>BIP-174 (v0)</button>
    <button onClick={()=>setBv("v2")} style={{padding:"9px 20px",borderRadius:8,border:bv==="v2"?"1.5px solid "+C.cyan+"50":"1.5px solid transparent",background:bv==="v2"?C.cyan+"12":"transparent",color:bv==="v2"?C.cyan:C.dim,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>BIP-370 (v2)</button>
  </div>);

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        textarea:focus{border-color:${C.borderHi}!important} button{font-family:inherit}
      `}</style>

      <div style={{padding:"28px 28px 0",borderBottom:"1px solid "+C.border,background:"linear-gradient(180deg,"+C.card+" 0%,"+C.bg+" 100%)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:4}}>
          <div style={{width:42,height:42,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:C.amber+"15",border:"2px solid "+C.amber+"40",fontSize:22}}>{"₿"}</div>
          <div>
            <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.amber,letterSpacing:"-0.03em"}}>PSBT Playground</h1>
            <p style={{margin:0,fontSize:13,color:C.soft}}>Partially Signed Bitcoin Transactions — BIP-174 &amp; BIP-370</p>
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:16}}>
          {TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"10px 16px",border:"none",cursor:"pointer",
            background:tab===t.id?C.amber+"12":"transparent",color:tab===t.id?C.amber:C.dim,
            fontWeight:700,fontSize:13,borderBottom:tab===t.id?"2.5px solid "+C.amber:"2.5px solid transparent",
            transition:"all 0.2s",display:"flex",alignItems:"center",gap:6,
          }}><span style={{fontSize:15}}>{t.icon}</span>{t.label}</button>))}
        </div>
      </div>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"28px 20px 80px"}}>

        {tab==="overview"&&<div style={{display:"flex",flexDirection:"column",gap:28,animation:"fadeIn 0.3s ease"}}>
          <Card>
            <Head icon="§" color={C.amber}>What is a PSBT?</Head>
            <div style={{fontSize:14,color:C.soft,lineHeight:1.9}}>
              <p style={{margin:"0 0 14px"}}>A <strong style={{color:C.amber}}>Partially Signed Bitcoin Transaction (PSBT)</strong> is a standardized binary format (BIP-174) enabling multiple parties and devices to collaboratively construct, sign, and finalize Bitcoin transactions without any party holding all information at once.</p>
              <p style={{margin:"0 0 14px"}}>PSBTs carry an <strong style={{color:C.text}}>unsigned (or partially signed) transaction</strong> alongside all auxiliary metadata — UTXO information, derivation paths, scripts, partial signatures — in structured <strong style={{color:C.text}}>key-value maps</strong>.</p>
              <p style={{margin:0}}>The format is transport-agnostic: files, QR codes, NFC, or any channel.</p>
            </div>
          </Card>
          <Card><Head icon="↻" color={C.green} sub="Click each role to see full responsibilities.">The PSBT Workflow — Six Roles</Head><RoleFlow/></Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <Card style={{borderColor:C.amber+"30"}}>
              <div style={{fontSize:16,fontWeight:800,color:C.amber,marginBottom:8}}>{"§"} BIP-174 (v0)</div>
              <p style={{margin:0,fontSize:13,color:C.soft,lineHeight:1.75}}>Original PSBT. Stores complete unsigned tx in global map. Structure fixed once created. Widely supported.</p>
            </Card>
            <Card style={{borderColor:C.cyan+"30"}}>
              <div style={{fontSize:16,fontWeight:800,color:C.cyan,marginBottom:8}}>{"⚒"} BIP-370 (v2)</div>
              <p style={{margin:0,fontSize:13,color:C.soft,lineHeight:1.75}}>Extended PSBT. Decomposes tx into per-input/per-output fields. Supports modifiable transactions. Essential for CoinJoin.</p>
            </Card>
          </div>
        </div>}

        {tab==="builder"&&<div style={{animation:"fadeIn 0.3s ease"}}><Card>
          <div style={{marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22}}>{"▶"}</span>
              <h3 style={{margin:0,fontSize:18,fontWeight:800,color:C.amber,letterSpacing:"-0.01em"}}>Build a PSBT — Click by Click</h3>
            </div>
            <p style={{margin:"6px 0 0 32px",fontSize:13,color:C.soft,lineHeight:1.7}}>Step through PSBT construction byte by byte. Four scenarios: v0 and v2, simple and multi-input. Compare how the same transaction looks in each format.</p>
          </div>
          <PSBTBuilderGame/>
        </Card></div>}

        {tab==="scenarios"&&<div style={{animation:"fadeIn 0.3s ease"}}>
          <Head icon="○" color={C.green} sub="Three real-world scenarios. Pick one and step through each role.">Interactive Scenario Walkthroughs</Head>
          <Scenarios/>
        </div>}

        {tab==="structure"&&<div style={{display:"flex",flexDirection:"column",gap:24,animation:"fadeIn 0.3s ease"}}>
          <VerTabs/>
          <Card><Head icon="▣" color={bv==="v2"?C.cyan:C.amber} sub="Click each section to expand.">Binary Structure — PSBT {bv==="v2"?"v2":"v0"}</Head><Structure version={bv==="v2"?2:0}/></Card>
          <Card><Head icon="↻" color={C.green} sub="Click each role.">Role Flow</Head><RoleFlow/></Card>
        </div>}

        {tab==="fields"&&<div style={{display:"flex",flexDirection:"column",gap:24,animation:"fadeIn 0.3s ease"}}>
          <VerTabs/>
          {bv==="v0"?<>
            <Card><FieldTable fields={GLOBAL_V0} title="Global Map Fields" icon="⊕"/></Card>
            <Card><FieldTable fields={INPUT_V0} title="Per-Input Map Fields" icon="←"/></Card>
            <Card><FieldTable fields={OUTPUT_V0} title="Per-Output Map Fields" icon="→"/></Card>
          </>:<>
            <Card>
              <FieldTable fields={[...GLOBAL_V0.filter(f=>f.key!=="0x00"),...V2_GLOBAL]} title="Global Map Fields (v2)" icon="⊕"/>
              <InfoBox color={C.cyan} icon="⚡"><strong style={{color:C.cyan}}>v2:</strong> UNSIGNED_TX (0x00) excluded. Tx data decomposed into per-input/per-output fields.</InfoBox>
            </Card>
            <Card>
              <FieldTable fields={[...INPUT_V0,...V2_INPUT]} title="Per-Input Map Fields (v2)" icon="←"/>
              <InfoBox color={C.green} icon="⚡"><strong style={{color:C.green}}>New:</strong> PREVIOUS_TXID + OUTPUT_INDEX replace unsigned tx. SEQUENCE + locktime per-input.</InfoBox>
            </Card>
            <Card>
              <FieldTable fields={[...OUTPUT_V0,...V2_OUTPUT]} title="Per-Output Map Fields (v2)" icon="→"/>
              <InfoBox color={C.blue} icon="⚡"><strong style={{color:C.blue}}>New:</strong> AMOUNT + SCRIPT explicit per output.</InfoBox>
            </Card>
          </>}
        </div>}

        {tab==="encoding"&&<div style={{animation:"fadeIn 0.3s ease"}}><Card><KVEncoding/></Card></div>}

        {tab==="compare"&&<div style={{animation:"fadeIn 0.3s ease"}}><Card>
          <Head icon="⚖️" color={C.cyan} sub="Click any row for the rationale.">BIP-174 (v0) vs BIP-370 (v2)</Head>
          <Compare/>
        </Card></div>}

        {tab==="serial"&&<div style={{animation:"fadeIn 0.3s ease"}}><Card><SerializationFlows/></Card></div>}

        {tab==="inspector"&&<div style={{animation:"fadeIn 0.3s ease"}}><Card>
          <Head icon="⊙" color={C.green} sub="Select an example or paste hex. Hover map labels to see which PSBT role populated each section.">Hex Inspector</Head>
          <Inspector/>
        </Card></div>}

      </div>
    </div>
  );
}
