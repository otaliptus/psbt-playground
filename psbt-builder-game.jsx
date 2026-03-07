import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const C = {
  bg:"#06090f",surface:"#0d1219",card:"#111923",cardHi:"#151f2d",
  border:"#1e2d42",borderHi:"#f59e0b",
  text:"#dfe8f4",soft:"#96a7bf",dim:"#576980",
  amber:"#f59e0b",green:"#22c55e",red:"#ef4444",blue:"#3b82f6",
  purple:"#a78bfa",cyan:"#06b6d4",orange:"#fb923c",teal:"#14b8a6",
};

// ━━━ SCENARIO DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Scenario 1: Simple 1-in 2-out
const SIMPLE_STEPS = [
  { phase:"setup", title:"The Scenario", desc:"Alice has 100,000 sats in a P2WPKH UTXO. She wants to send 10,000 sats to Bob and get 89,800 sats back as change (200 sat fee).", hexAdd:"", visual:"scenario" },
  { phase:"creator", title:"Write Magic Bytes", desc:"Every PSBT starts with 5 magic bytes: ASCII \"psbt\" (70 73 62 74) followed by 0xFF. The 0xFF separator can never be a valid compact-size key length, so parsers instantly know: \"this is a PSBT, not a raw transaction.\"", action:"click", hexAdd:"70736274ff", fieldLabel:"MAGIC", fieldColor:C.red, visual:"magic" },
  { phase:"creator", title:"Global Key: UNSIGNED_TX type", desc:"The global map's first (and only required) entry. Key-length = 01 (1 byte of key data). Key-type = 00 (PSBT_GLOBAL_UNSIGNED_TX). This tells the parser: \"the value that follows is a complete unsigned transaction.\"", action:"click", hexAdd:"0100", fieldLabel:"KEY: type 0x00", fieldColor:C.amber, visual:"global_key" },
  { phase:"creator", title:"Value Length (unsigned tx)", desc:"The unsigned transaction is 85 bytes long. 85 = 0x55 in hex. Since it's < 253, we encode it as a single byte. If the tx were larger (253+ bytes), we'd use 0xFD + 2 bytes LE.", action:"click", hexAdd:"55", fieldLabel:"VALUE LEN: 85 bytes", fieldColor:C.purple, visual:"val_len" },
  { phase:"creator", title:"Tx Version", desc:"Transaction version 2 (02000000 in little-endian). Version 2 enables BIP-68 relative lock-time. Almost all modern transactions use version 2.", action:"click", hexAdd:"02000000", fieldLabel:"TX VERSION: 2", fieldColor:C.purple, visual:"tx_version" },
  { phase:"creator", title:"Input Count", desc:"Varint: 01 = one input. Alice is spending a single UTXO. This tells the parser exactly how many input structures follow.", action:"click", hexAdd:"01", fieldLabel:"INPUT COUNT: 1", fieldColor:C.dim, visual:"input_count" },
  { phase:"creator", title:"Previous TXID (Input 0)", desc:"The 32-byte transaction ID of Alice's UTXO, in internal (reversed) byte order. This points to the transaction that created the output Alice is now spending. On a block explorer you'd see these bytes reversed.", action:"click", hexAdd:"3f4fa19803dec4d6a84fae3821da7ac7577080ef75451294e71f9b20e0ab1e7b", fieldLabel:"PREV TXID (32B)", fieldColor:C.orange, visual:"prev_txid" },
  { phase:"creator", title:"Previous Output Index", desc:"Which output of that transaction? 00000000 = output index 0 (little-endian uint32). Combined with the TXID above, this uniquely identifies Alice's UTXO on the blockchain.", action:"click", hexAdd:"00000000", fieldLabel:"PREV VOUT: 0", fieldColor:C.orange, visual:"prev_vout" },
  { phase:"creator", title:"ScriptSig Length = EMPTY", desc:"00 = empty scriptSig. This is CRITICAL for PSBT: the unsigned transaction must have ALL scriptSigs empty. Signatures don't go here — they go in the PSBT input maps. This is what makes a PSBT \"unsigned.\"", action:"click", hexAdd:"00", fieldLabel:"SCRIPTSIG: empty!", fieldColor:C.red, visual:"empty_scriptsig" },
  { phase:"creator", title:"Sequence Number", desc:"ffffffff = final sequence. No RBF (replace-by-fee), no relative locktime. If Alice wanted RBF, she'd use fffffffe or lower.", action:"click", hexAdd:"ffffffff", fieldLabel:"SEQUENCE: final", fieldColor:C.dim, visual:"sequence" },
  { phase:"creator", title:"Output Count", desc:"02 = two outputs. One payment to Bob (10,000 sats) and one change back to Alice (89,800 sats). The 200 sat difference is the miner fee.", action:"click", hexAdd:"02", fieldLabel:"OUTPUT COUNT: 2", fieldColor:C.dim, visual:"output_count" },
  { phase:"creator", title:"Output 0: Amount (Bob)", desc:"1027000000000000 = 10,000 satoshis in 64-bit little-endian. That's 0x2710 = 10000. Bob receives this. 8 bytes, always, even for small amounts.", action:"click", hexAdd:"1027000000000000", fieldLabel:"OUT 0 AMT: 10,000 sats", fieldColor:C.green, visual:"out0_amount" },
  { phase:"creator", title:"Output 0: ScriptPubKey (Bob)", desc:"16 = 22 bytes of script follow. 0014 = OP_0 PUSH20 (P2WPKH program). Then 20 bytes of Bob's pubkey hash. This locks the funds so only Bob's private key can spend them.", action:"click", hexAdd:"160014d85c2b71d0060b09c9886aeb815e50991dda124d", fieldLabel:"OUT 0 SCRIPT: P2WPKH", fieldColor:C.blue, visual:"out0_script" },
  { phase:"creator", title:"Output 1: Amount (Alice change)", desc:"d85e010000000000 = 89,800 satoshis (0x15ED8) in 64-bit LE. This is Alice's change. Input (100,000) - Bob (10,000) - Fee (200) = 89,800.", action:"click", hexAdd:"d85e010000000000", fieldLabel:"OUT 1 AMT: 89,800 sats", fieldColor:C.green, visual:"out1_amount" },
  { phase:"creator", title:"Output 1: ScriptPubKey (Alice change)", desc:"Another P2WPKH output, this time to Alice's change address. Same structure: OP_0 PUSH20 <hash160(change_pubkey)>.", action:"click", hexAdd:"16001400aea9a2e5f0f876a588df5546e8742d1d87008f", fieldLabel:"OUT 1 SCRIPT: P2WPKH", fieldColor:C.blue, visual:"out1_script" },
  { phase:"creator", title:"Locktime", desc:"00000000 = no locktime. The transaction can be included in any block. Locktime is 4 bytes LE at the end of every transaction.", action:"click", hexAdd:"00000000", fieldLabel:"LOCKTIME: 0", fieldColor:C.dim, visual:"locktime" },
  { phase:"creator", title:"End Global Map", desc:"0x00 = map separator. Key-length of zero means \"no more key-value pairs in this map.\" The parser now moves from the global map to input maps.", action:"click", hexAdd:"00", fieldLabel:"SEPARATOR", fieldColor:C.dim, visual:"sep_global" },
  { phase:"creator", title:"Input 0 Map: Empty (Creator)", desc:"The Creator doesn't add any metadata to input maps — that's the Updater's job. So Input 0's map is just a bare 0x00 separator. An empty map is valid!", action:"click", hexAdd:"00", fieldLabel:"INPUT 0: empty", fieldColor:C.green, visual:"sep_input" },
  { phase:"creator", title:"Output 0 Map: Empty", desc:"Same story — the Creator leaves output maps empty. The Updater will later add BIP32 derivation paths for change detection.", action:"click", hexAdd:"00", fieldLabel:"OUTPUT 0: empty", fieldColor:C.blue, visual:"sep_out0" },
  { phase:"creator", title:"Output 1 Map: Empty", desc:"The last output map, also empty. After this separator, the PSBT is complete! We have: magic + global map + separator + input map + separator + 2 output maps + 2 separators.", action:"click", hexAdd:"00", fieldLabel:"OUTPUT 1: empty", fieldColor:C.blue, visual:"sep_out1" },
  { phase:"creator_done", title:"Creator Phase Complete!", desc:"The PSBT is now a valid, parseable binary. It contains the unsigned transaction skeleton with Alice's input and two outputs. But it has NO metadata — no UTXO info, no derivation paths, no signatures. A signer receiving this can't do anything yet.", hexAdd:"", visual:"creator_complete" },
  { phase:"updater", title:"Updater: Rewind to Input 0", desc:"The Updater re-opens Input 0's map (replacing the bare 0x00 with actual fields). It needs to tell the signer: \"the UTXO being spent is worth 100,000 sats and is locked by this P2WPKH script.\" This is PSBT_IN_WITNESS_UTXO.", hexAdd:"", visual:"updater_rewind", hexReplace:{removeTrailing:3,desc:"Remove 3 trailing 0x00 separators (input0 + out0 + out1)"} },
  { phase:"updater", title:"WITNESS_UTXO: Key", desc:"Key-length = 01, key-type = 01 (PSBT_IN_WITNESS_UTXO). This field carries just the output being spent — amount + scriptPubKey. It's compact (~30 bytes) unlike NON_WITNESS_UTXO which carries the entire previous transaction.", action:"click", hexAdd:"0101", fieldLabel:"KEY: WITNESS_UTXO", fieldColor:C.green, visual:"witness_utxo_key" },
  { phase:"updater", title:"WITNESS_UTXO: Value", desc:"Value-length = 1a (26 bytes). Then 8 bytes amount: a086010000000000 = 100,000 sats. Then the scriptPubKey: 160014d85c2b71d0060b09c9886aeb815e50991dda124d (22-byte P2WPKH). The signer needs the amount for BIP-143 sighash computation.", action:"click", hexAdd:"1aa086010000000000160014d85c2b71d0060b09c9886aeb815e50991dda124d", fieldLabel:"VAL: 100k sats + script", fieldColor:C.green, visual:"witness_utxo_val" },
  { phase:"updater", title:"BIP32_DERIVATION: Key", desc:"Key-length = 22 (34 bytes: 1 type + 33 pubkey). Key-type = 06 (PSBT_IN_BIP32_DERIVATION). Key-data = Alice's 33-byte compressed pubkey. This tells the hardware wallet WHICH key signed this input.", action:"click", hexAdd:"22060279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798", fieldLabel:"KEY: BIP32 + pubkey", fieldColor:C.amber, visual:"bip32_key" },
  { phase:"updater", title:"BIP32_DERIVATION: Value", desc:"Value-length = 18 (24 bytes). First 4 bytes: d90c6a4f = master fingerprint. Then 5 path indices (4 bytes each, LE): 54000080=84' 00000080=0' 00000080=0' 00000000=0 07000000=7. Full path: m/84'/0'/0'/0/7. The 0x80 prefix marks hardened derivation.", action:"click", hexAdd:"18d90c6a4f5400008000000080000000800000000007000000", fieldLabel:"VAL: m/84'/0'/0'/0/7", fieldColor:C.amber, visual:"bip32_val" },
  { phase:"updater", title:"Close Input 0 + Output Maps", desc:"0x00 closes the now-enriched Input 0 map. Then two more 0x00 bytes close the two (still empty) output maps. In a real wallet, the Updater would also add BIP32_DERIVATION to the change output — we skip that for clarity.", action:"click", hexAdd:"000000", fieldLabel:"3x SEPARATOR", fieldColor:C.dim, visual:"close_all" },
  { phase:"updater_done", title:"Updater Phase Complete!", desc:"The PSBT now carries everything a signer needs: the unsigned transaction, the UTXO being spent (100,000 sats + P2WPKH script), and the BIP32 derivation path so the hardware wallet can find the right private key. Ready for signing!", hexAdd:"", visual:"updater_complete" },
  { phase:"signer", title:"Signer: Rewind to Input 0", desc:"The Signer (hardware wallet) opens the PSBT, reads WITNESS_UTXO to learn the input amount, computes the fee (200 sats), displays \"Send 10,000 sats? Fee: 200 sats\" on its screen. Alice confirms. Now it signs.", hexAdd:"", visual:"signer_rewind", hexReplace:{removeTrailing:3,desc:"Remove 3 trailing separators to re-open input map"} },
  { phase:"signer", title:"PARTIAL_SIG: Key", desc:"Key-length = 22 (34 bytes: 1 type + 33 pubkey). Key-type = 02 (PSBT_IN_PARTIAL_SIG). Key-data = the same compressed pubkey. The key identifies WHO signed. In multisig, there'd be multiple PARTIAL_SIG entries with different pubkeys.", action:"click", hexAdd:"22020279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798", fieldLabel:"KEY: PARTIAL_SIG", fieldColor:C.red, visual:"partial_sig_key" },
  { phase:"signer", title:"PARTIAL_SIG: Value (DER signature)", desc:"Value-length = 47 (71 bytes). The DER-encoded ECDSA signature: 30 (SEQUENCE) 44 (68 bytes) 02-20 (INTEGER r, 32B) 02-20 (INTEGER s, 32B) then 01 (SIGHASH_ALL). The s value is low-s per BIP-62. This sig proves Alice authorized the spend.", action:"click", hexAdd:"473044022057b5f2739b2acf4706085e5f1378eab397e25e95666c50951a3d3f02a7dc3ab50220173c3f4f2f1be24cc2e97ad3a1b4f6c5e85d7a0f25e6abbe3be7db2c1ae32dfe01", fieldLabel:"VAL: DER sig (71B)", fieldColor:C.red, visual:"partial_sig_val" },
  { phase:"signer", title:"Close All Maps (signed)", desc:"Close Input 0 (now with WITNESS_UTXO + BIP32 + PARTIAL_SIG) and the two output maps. The PSBT is now partially signed — ready for the Finalizer.", action:"click", hexAdd:"000000", fieldLabel:"3x SEPARATOR", fieldColor:C.dim, visual:"close_signed" },
  { phase:"signer_done", title:"Signer Phase Complete!", desc:"Alice's hardware wallet has added her ECDSA signature as a PARTIAL_SIG. For single-sig P2WPKH, one signature is all we need. In multisig, we'd pass to more signers or use the Combiner to merge. Next: Finalizer.", hexAdd:"", visual:"signer_complete" },
  { phase:"finalizer", title:"Finalizer: Build Witness", desc:"The Finalizer takes the PARTIAL_SIG + pubkey and constructs FINAL_SCRIPTWITNESS: a witness stack with 2 items — [<signature>, <pubkey>]. It then STRIPS all non-final fields (WITNESS_UTXO, BIP32_DERIVATION, PARTIAL_SIG, SIGHASH_TYPE). The input is now locked.", hexAdd:"", visual:"finalizer_explain" },
  { phase:"extractor", title:"Extractor: Broadcast!", desc:"The Extractor takes the unsigned transaction from the global map, inserts the finalized witness, adds the SegWit marker (00) and flag (01) bytes, and produces a valid signed transaction ready for broadcast. The PSBT's job is done.", hexAdd:"", visual:"extractor_explain" },
];

// Scenario 2: 2-input 3-output (consolidation + multi-pay)
// Alice has two UTXOs: 50,000 sats (from tx AAA..., vout 0) and 80,000 sats (from tx BBB..., vout 2)
// She sends 45,000 to Bob, 30,000 to Carol, 54,500 change to herself. Fee: 500 sats.
// Unsigned tx size: 4 + 1 + 41 + 41 + 1 + 31 + 31 + 31 + 4 = 185 bytes = 0xB9
const MULTI_STEPS = [
  { phase:"setup", title:"The Scenario", desc:"Alice has TWO P2WPKH UTXOs: 50,000 sats (UTXO A) and 80,000 sats (UTXO B). She sends 45,000 to Bob, 30,000 to Carol, and gets 54,500 back as change. Fee: 500 sats (130,000 - 45,000 - 30,000 - 54,500 = 500). This teaches multi-input spending and output fan-out.", hexAdd:"", visual:"scenario" },
  // ── MAGIC ──
  { phase:"creator", title:"Write Magic Bytes", desc:"Same 5 magic bytes as any PSBT: \"psbt\" + 0xFF. No matter how complex the transaction, the PSBT always starts identical.", action:"click", hexAdd:"70736274ff", fieldLabel:"MAGIC", fieldColor:C.red, visual:"magic" },
  // ── GLOBAL KEY ──
  { phase:"creator", title:"Global Key: UNSIGNED_TX", desc:"Key-length = 01, key-type = 00. Same as before — one unsigned transaction in the global map.", action:"click", hexAdd:"0100", fieldLabel:"KEY: type 0x00", fieldColor:C.amber, visual:"global_key" },
  { phase:"creator", title:"Value Length (unsigned tx)", desc:"This transaction is 185 bytes (2 inputs + 3 outputs = more data). 185 = 0xB9. Still fits in a single compact-size byte (< 253).", action:"click", hexAdd:"b9", fieldLabel:"VALUE LEN: 185 bytes", fieldColor:C.purple, visual:"val_len" },
  // ── TX BODY ──
  { phase:"creator", title:"Tx Version", desc:"02000000 = version 2, same as always.", action:"click", hexAdd:"02000000", fieldLabel:"TX VERSION: 2", fieldColor:C.purple, visual:"tx_version" },
  { phase:"creator", title:"Input Count: TWO", desc:"02 = two inputs. Alice is spending BOTH her UTXOs in one transaction. This is called \"coin consolidation\" — merging multiple UTXOs into outputs. Each input needs its own TXID + vout + empty scriptSig + sequence.", action:"click", hexAdd:"02", fieldLabel:"INPUT COUNT: 2", fieldColor:C.dim, visual:"input_count" },
  // ── INPUT 0 (UTXO A: 50k sats) ──
  { phase:"creator", title:"Input 0: TXID (UTXO A)", desc:"32-byte TXID of Alice's first UTXO (50,000 sats). Internal byte order. This is UTXO A — maybe from a previous payment Alice received.", action:"click", hexAdd:"aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111", fieldLabel:"IN 0: PREV TXID", fieldColor:C.orange, visual:"prev_txid_0" },
  { phase:"creator", title:"Input 0: Vout", desc:"00000000 = output index 0. UTXO A was the first output of its transaction.", action:"click", hexAdd:"00000000", fieldLabel:"IN 0: VOUT 0", fieldColor:C.orange, visual:"prev_vout_0" },
  { phase:"creator", title:"Input 0: Empty ScriptSig", desc:"00 = empty. Remember: ALL inputs must have empty scriptSigs in a PSBT. The actual signatures go in the per-input PSBT maps, not here.", action:"click", hexAdd:"00", fieldLabel:"IN 0: SCRIPTSIG empty", fieldColor:C.red, visual:"empty_scriptsig_0" },
  { phase:"creator", title:"Input 0: Sequence", desc:"feffffff = 0xFFFFFFFE. This enables nLockTime and signals RBF (BIP-125). Unlike the simple scenario, Alice wants the option to replace this transaction if it gets stuck.", action:"click", hexAdd:"feffffff", fieldLabel:"IN 0: SEQ (RBF)", fieldColor:C.dim, visual:"sequence_0" },
  // ── INPUT 1 (UTXO B: 80k sats) ──
  { phase:"creator", title:"Input 1: TXID (UTXO B)", desc:"32-byte TXID of Alice's second UTXO (80,000 sats). A different transaction entirely. The parser knows to expect a second input because input count = 2.", action:"click", hexAdd:"bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222", fieldLabel:"IN 1: PREV TXID", fieldColor:C.orange, visual:"prev_txid_1" },
  { phase:"creator", title:"Input 1: Vout", desc:"02000000 = output index 2 (LE). UTXO B was the third output (index 2) of its transaction. Unlike UTXO A which was at index 0.", action:"click", hexAdd:"02000000", fieldLabel:"IN 1: VOUT 2", fieldColor:C.orange, visual:"prev_vout_1" },
  { phase:"creator", title:"Input 1: Empty ScriptSig", desc:"00 = empty. Same rule for every input — always empty in the unsigned tx.", action:"click", hexAdd:"00", fieldLabel:"IN 1: SCRIPTSIG empty", fieldColor:C.red, visual:"empty_scriptsig_1" },
  { phase:"creator", title:"Input 1: Sequence", desc:"feffffff = same RBF-enabled sequence as input 0. Both inputs use the same sequence value.", action:"click", hexAdd:"feffffff", fieldLabel:"IN 1: SEQ (RBF)", fieldColor:C.dim, visual:"sequence_1" },
  // ── OUTPUTS ──
  { phase:"creator", title:"Output Count: THREE", desc:"03 = three outputs. Bob gets 45,000. Carol gets 30,000. Alice gets 54,500 change. This \"fan-out\" pattern is common — pay multiple people in one tx to save fees.", action:"click", hexAdd:"03", fieldLabel:"OUTPUT COUNT: 3", fieldColor:C.dim, visual:"output_count" },
  { phase:"creator", title:"Output 0: Amount (Bob)", desc:"c8af000000000000 = 45,000 satoshis (0xAFC8) in 64-bit LE. Bob's payment.", action:"click", hexAdd:"c8af000000000000", fieldLabel:"OUT 0: 45,000 sats", fieldColor:C.green, visual:"out0_amount" },
  { phase:"creator", title:"Output 0: Script (Bob)", desc:"P2WPKH to Bob: 16 (22 bytes) + 0014 (OP_0 PUSH20) + 20-byte pubkey hash. Same locking script structure as the simple scenario.", action:"click", hexAdd:"160014d85c2b71d0060b09c9886aeb815e50991dda124d", fieldLabel:"OUT 0: P2WPKH (Bob)", fieldColor:C.blue, visual:"out0_script" },
  { phase:"creator", title:"Output 1: Amount (Carol)", desc:"3075000000000000 = 30,000 satoshis (0x7530) in 64-bit LE. Carol's payment.", action:"click", hexAdd:"3075000000000000", fieldLabel:"OUT 1: 30,000 sats", fieldColor:C.green, visual:"out1_amount" },
  { phase:"creator", title:"Output 1: Script (Carol)", desc:"P2WPKH to Carol: same structure, different pubkey hash. Each recipient has their own unique hash derived from their public key.", action:"click", hexAdd:"160014a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", fieldLabel:"OUT 1: P2WPKH (Carol)", fieldColor:C.blue, visual:"out1_script" },
  { phase:"creator", title:"Output 2: Amount (Alice change)", desc:"14d5000000000000 = 54,500 satoshis (0xD514) in 64-bit LE. Alice's change: 130,000 total input - 45,000 (Bob) - 30,000 (Carol) - 500 (fee) = 54,500.", action:"click", hexAdd:"14d5000000000000", fieldLabel:"OUT 2: 54,500 sats", fieldColor:C.green, visual:"out2_amount" },
  { phase:"creator", title:"Output 2: Script (Alice change)", desc:"P2WPKH to Alice's change address. Her wallet generated a fresh address for privacy — you should never reuse addresses.", action:"click", hexAdd:"16001400aea9a2e5f0f876a588df5546e8742d1d87008f", fieldLabel:"OUT 2: P2WPKH (change)", fieldColor:C.blue, visual:"out2_script" },
  { phase:"creator", title:"Locktime", desc:"00000000 = no locktime. Even though the inputs signal RBF, the transaction itself has no time restriction.", action:"click", hexAdd:"00000000", fieldLabel:"LOCKTIME: 0", fieldColor:C.dim, visual:"locktime" },
  // ── MAP SEPARATORS ──
  { phase:"creator", title:"End Global Map", desc:"0x00 closes the global map. Parser expects input maps next — TWO of them (matching the input count in the tx).", action:"click", hexAdd:"00", fieldLabel:"SEPARATOR", fieldColor:C.dim, visual:"sep_global" },
  { phase:"creator", title:"Input 0 Map: Empty", desc:"Empty map for input 0. Updater will fill it.", action:"click", hexAdd:"00", fieldLabel:"INPUT 0: empty", fieldColor:C.green, visual:"sep_in0" },
  { phase:"creator", title:"Input 1 Map: Empty", desc:"Empty map for input 1. Note: there are as many input maps as there are inputs in the unsigned tx. Even empty maps need their 0x00 separator.", action:"click", hexAdd:"00", fieldLabel:"INPUT 1: empty", fieldColor:C.green, visual:"sep_in1" },
  { phase:"creator", title:"Output 0 Map: Empty", desc:"Empty output map. Three output maps follow — one per output.", action:"click", hexAdd:"00", fieldLabel:"OUTPUT 0: empty", fieldColor:C.blue, visual:"sep_out0" },
  { phase:"creator", title:"Output 1 Map: Empty", desc:"Output 1 map (Carol's payment).", action:"click", hexAdd:"00", fieldLabel:"OUTPUT 1: empty", fieldColor:C.blue, visual:"sep_out1" },
  { phase:"creator", title:"Output 2 Map: Empty", desc:"Output 2 map (Alice's change). After this separator the PSBT is complete. 5 maps total: global + 2 inputs + 3 outputs, but the structure is: magic + global_data + 0x00 + in0_data + 0x00 + in1_data + 0x00 + out0_data + 0x00 + out1_data + 0x00 + out2_data + 0x00.", action:"click", hexAdd:"00", fieldLabel:"OUTPUT 2: empty", fieldColor:C.blue, visual:"sep_out2" },
  { phase:"creator_done", title:"Creator Phase Complete!", desc:"The PSBT has the full transaction skeleton: 2 inputs consuming 130,000 sats, 3 outputs totaling 129,500 sats, 500 sat fee. 5 empty maps waiting for the Updater. This PSBT is larger than the simple one (more inputs/outputs = more bytes), but the structure is identical.", hexAdd:"", visual:"creator_complete" },
  // ── UPDATER ──
  { phase:"updater", title:"Updater: Rewind to Input 0", desc:"Remove the 5 trailing empty map separators (2 inputs + 3 outputs). The Updater will now enrich BOTH input maps with WITNESS_UTXO and BIP32 derivation data.", hexAdd:"", visual:"updater_rewind", hexReplace:{removeTrailing:5, desc:"Remove 5 trailing 0x00 separators"} },
  // Input 0 metadata
  { phase:"updater", title:"Input 0: WITNESS_UTXO Key", desc:"Key-length=01, key-type=01. Same PSBT_IN_WITNESS_UTXO for input 0. Tells signer about UTXO A.", action:"click", hexAdd:"0101", fieldLabel:"IN 0: WITNESS_UTXO key", fieldColor:C.green, visual:"wu_key_0" },
  { phase:"updater", title:"Input 0: WITNESS_UTXO Value", desc:"Value-length=1a (26B). Amount: 50c3000000000000 = 50,000 sats. Script: P2WPKH (0014 + 20-byte hash). The signer now knows input 0 is worth 50,000 sats.", action:"click", hexAdd:"1a50c3000000000000160014d85c2b71d0060b09c9886aeb815e50991dda124d", fieldLabel:"IN 0: 50k sats + script", fieldColor:C.green, visual:"wu_val_0" },
  { phase:"updater", title:"Input 0: BIP32 Key + Value", desc:"BIP32_DERIVATION for input 0. Key = type 06 + Alice's pubkey (34B). Value = fingerprint d90c6a4f + path m/84'/0'/0'/0/3. The hardware wallet uses this to find the right private key for UTXO A.", action:"click", hexAdd:"22060279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179818d90c6a4f540000800000008000000080000000000300000000", fieldLabel:"IN 0: BIP32 m/84'/0'/0'/0/3", fieldColor:C.amber, visual:"bip32_0" },
  { phase:"updater", title:"Close Input 0 Map", desc:"0x00 closes input 0. Its map now has WITNESS_UTXO + BIP32_DERIVATION. Moving to input 1.", action:"click", hexAdd:"00", fieldLabel:"IN 0: close", fieldColor:C.dim, visual:"close_in0" },
  // Input 1 metadata
  { phase:"updater", title:"Input 1: WITNESS_UTXO Key", desc:"Same key structure for input 1. The Updater processes each input independently — each gets its own UTXO data.", action:"click", hexAdd:"0101", fieldLabel:"IN 1: WITNESS_UTXO key", fieldColor:C.green, visual:"wu_key_1" },
  { phase:"updater", title:"Input 1: WITNESS_UTXO Value", desc:"Amount: 80380100000000000 = 80,000 sats (0x13880). Script: P2WPKH (different pubkey hash — this is a different address). Now the signer knows the total: 50,000 + 80,000 = 130,000 sats in, 129,500 out, fee = 500.", action:"click", hexAdd:"1a80380100000000000160014a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", fieldLabel:"IN 1: 80k sats + script", fieldColor:C.green, visual:"wu_val_1" },
  { phase:"updater", title:"Input 1: BIP32 Key + Value", desc:"BIP32_DERIVATION for input 1. Same master fingerprint, different path: m/84'/0'/0'/0/11. UTXO B came from address index 11, while UTXO A was index 3. The hardware wallet derives different private keys for each.", action:"click", hexAdd:"22060379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179818d90c6a4f5400008000000080000000800000000b0b00000000", fieldLabel:"IN 1: BIP32 m/84'/0'/0'/0/11", fieldColor:C.amber, visual:"bip32_1" },
  { phase:"updater", title:"Close Input 1 + Output Maps", desc:"Close input 1 map (0x00), then three 0x00 bytes for the three empty output maps. 4 separators total.", action:"click", hexAdd:"00000000", fieldLabel:"4x SEPARATOR", fieldColor:C.dim, visual:"close_all" },
  { phase:"updater_done", title:"Updater Phase Complete!", desc:"Both inputs now have WITNESS_UTXO and BIP32_DERIVATION. The signer can: (1) derive the private keys for both inputs, (2) verify total input amount = 130,000, (3) compute fee = 500, (4) display all three output destinations. Two separate signatures needed.", hexAdd:"", visual:"updater_complete" },
  // ── SIGNER ──
  { phase:"signer", title:"Signer: Rewind to Input 0", desc:"The hardware wallet opens the PSBT. It reads BOTH WITNESS_UTXOs, confirms the fee (500 sats), and displays: \"Send 45,000 to Bob + 30,000 to Carol? Fee: 500 sats.\" Alice approves. The signer will now sign BOTH inputs — each gets its own signature.", hexAdd:"", visual:"signer_rewind", hexReplace:{removeTrailing:4, desc:"Remove 4 trailing separators"} },
  { phase:"signer", title:"Input 0: PARTIAL_SIG Key", desc:"Key-type=02 + Alice's pubkey. Signing input 0 (UTXO A, 50k sats). The BIP-143 sighash for this input commits to ALL outputs, UTXO A's amount, and the outpoint. Each input gets its own unique sighash.", action:"click", hexAdd:"22020279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798", fieldLabel:"IN 0: SIG key", fieldColor:C.red, visual:"sig_key_0" },
  { phase:"signer", title:"Input 0: PARTIAL_SIG Value", desc:"71-byte DER signature for input 0. This signature commits to spending UTXO A specifically. A different sighash was computed than for input 1 (different outpoint, same outputs).", action:"click", hexAdd:"473044022057b5f2739b2acf4706085e5f1378eab397e25e95666c50951a3d3f02a7dc3ab50220173c3f4f2f1be24cc2e97ad3a1b4f6c5e85d7a0f25e6abbe3be7db2c1ae32dfe01", fieldLabel:"IN 0: DER sig (71B)", fieldColor:C.red, visual:"sig_val_0" },
  { phase:"signer", title:"Close Input 0 (signed)", desc:"0x00 closes input 0. It now has: WITNESS_UTXO + BIP32 + PARTIAL_SIG. Moving to sign input 1.", action:"click", hexAdd:"00", fieldLabel:"IN 0: close", fieldColor:C.dim, visual:"close_signed_0" },
  // Sign input 1
  { phase:"signer", title:"Input 1: PARTIAL_SIG Key", desc:"Key-type=02 + different pubkey (for UTXO B's address). Input 1 may use a different key than input 0 since the UTXOs came from different addresses.", action:"click", hexAdd:"22020379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798", fieldLabel:"IN 1: SIG key", fieldColor:C.red, visual:"sig_key_1" },
  { phase:"signer", title:"Input 1: PARTIAL_SIG Value", desc:"71-byte DER signature for input 1. Different signature from input 0 — each input's sighash is unique because the outpoint (txid:vout) differs. The hardware wallet signs both in one session.", action:"click", hexAdd:"47304402201a2b3c4d5e6f708192a3b4c5d6e7f80a1b2c3d4e5f607182939495a6b7c8d9022019283746556473829104a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f01", fieldLabel:"IN 1: DER sig (71B)", fieldColor:C.red, visual:"sig_val_1" },
  { phase:"signer", title:"Close Input 1 + Output Maps", desc:"Close input 1, then three output map separators. Both inputs are now signed — the PSBT carries two PARTIAL_SIG entries, one per input. Ready for finalization.", action:"click", hexAdd:"00000000", fieldLabel:"4x SEPARATOR", fieldColor:C.dim, visual:"close_signed" },
  { phase:"signer_done", title:"Signer Phase Complete!", desc:"Both inputs signed. The hardware wallet produced two independent ECDSA signatures — one per UTXO. Each signature commits to the same set of outputs but a different input outpoint. In single-sig P2WPKH, one signature per input is sufficient.", hexAdd:"", visual:"signer_complete" },
  // ── FINALIZER + EXTRACTOR ──
  { phase:"finalizer", title:"Finalizer: Build Two Witnesses", desc:"The Finalizer processes EACH input independently:\n\nInput 0: witness = [<sig_A>, <pubkey_A>]\nInput 1: witness = [<sig_B>, <pubkey_B>]\n\nBoth are standard P2WPKH finalization. It strips all non-final fields from both inputs. Two FINAL_SCRIPTWITNESS entries created.", hexAdd:"", visual:"finalizer_explain" },
  { phase:"extractor", title:"Extractor: Broadcast!", desc:"The Extractor builds the final transaction: version + marker(00) + flag(01) + 2 inputs (empty scriptSigs) + 3 outputs + witness_0 + witness_1 + locktime. Two witness stacks for two inputs. Transaction broadcast merges Alice's two UTXOs into Bob's payment, Carol's payment, and Alice's change. Done!", hexAdd:"", visual:"extractor_explain" },
];

// ━━━ PSBTv2 SCENARIOS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// V2 Simple: same 1-in 2-out but using BIP-370 decomposed format
const V2_SIMPLE_STEPS = [
  { phase:"setup", title:"The Scenario (v2)", desc:"Same transaction as v0: Alice sends 10,000 sats to Bob from her 100,000 sat P2WPKH UTXO (200 sat fee). But now using PSBTv2 (BIP-370). The BIG difference: no UNSIGNED_TX blob. Instead, transaction data is decomposed into per-input and per-output map fields. Compare with the v0 version to see exactly what changed.", hexAdd:"", visual:"scenario" },
  // ── MAGIC (same) ──
  { phase:"creator", title:"Write Magic Bytes", desc:"Same 5 magic bytes as v0. The magic is version-agnostic — parsers detect v0 vs v2 by reading (or not reading) PSBT_GLOBAL_VERSION later.", action:"click", hexAdd:"70736274ff", fieldLabel:"MAGIC", fieldColor:C.red, visual:"magic" },
  // ── GLOBAL MAP: v2 decomposed fields ──
  { phase:"creator", title:"Global: PSBT VERSION = 2", desc:"Key-len=01, key-type=FB (PSBT_GLOBAL_VERSION). Value-len=04, value=02000000 (LE uint32 = 2). This field is REQUIRED in v2 and MUST be 2. In v0 it's absent (or 0). A parser seeing version=2 knows: no UNSIGNED_TX, expect decomposed fields.", action:"click", hexAdd:"01fb0402000000", fieldLabel:"VERSION: 2", fieldColor:C.cyan, visual:"global_version" },
  { phase:"creator", title:"Global: TX_VERSION = 2", desc:"Key-type=02 (PSBT_GLOBAL_TX_VERSION). Value=02000000. In v0 this was buried inside the unsigned tx blob. In v2 it's a standalone global field. Same tx version 2 (BIP-68 relative locktime).", action:"click", hexAdd:"01020402000000", fieldLabel:"TX_VERSION: 2", fieldColor:C.purple, visual:"tx_version" },
  { phase:"creator", title:"Global: INPUT_COUNT = 1", desc:"Key-type=04 (PSBT_GLOBAL_INPUT_COUNT). Value=01. Tells the parser: expect 1 input map after the global separator. In v0 the parser inferred this from the unsigned tx. In v2 it's explicit — and can be INCREMENTED by Constructors.", action:"click", hexAdd:"01040101", fieldLabel:"INPUT_COUNT: 1", fieldColor:C.green, visual:"input_count" },
  { phase:"creator", title:"Global: OUTPUT_COUNT = 2", desc:"Key-type=05 (PSBT_GLOBAL_OUTPUT_COUNT). Value=02. Two output maps follow. Again, in v0 this was implicit in the unsigned tx. In v2 it's explicit and modifiable.", action:"click", hexAdd:"01050102", fieldLabel:"OUTPUT_COUNT: 2", fieldColor:C.green, visual:"output_count" },
  { phase:"creator", title:"Global: TX_MODIFIABLE = 0x00", desc:"Key-type=06 (PSBT_GLOBAL_TX_MODIFIABLE). Value=00 (not modifiable). Bit 0 = inputs modifiable, bit 1 = outputs modifiable. 0x00 = locked. For CoinJoin you'd set 0x03 during registration. Alice's simple send is locked from the start.", action:"click", hexAdd:"01060100", fieldLabel:"TX_MODIFIABLE: 0x00", fieldColor:C.cyan, visual:"tx_modifiable" },
  { phase:"creator", title:"End Global Map", desc:"0x00 separator. Notice how LEAN the v2 global map is: just VERSION + TX_VERSION + INPUT_COUNT + OUTPUT_COUNT + TX_MODIFIABLE. No 85-byte unsigned tx blob! The transaction data lives in the input/output maps where it belongs.", action:"click", hexAdd:"00", fieldLabel:"SEPARATOR", fieldColor:C.dim, visual:"sep_global" },
  // ── INPUT 0 MAP: tx data lives here now ──
  { phase:"creator", title:"Input 0: PREVIOUS_TXID", desc:"Key-type=0E (PSBT_IN_PREVIOUS_TXID). Value = 32-byte TXID. In v0 this was embedded inside the unsigned tx. In v2 it's a standalone field in the input map. This is THE key v2 innovation — inputs are self-contained, so they can be added/removed without re-serializing a monolithic tx.", action:"click", hexAdd:"010e203f4fa19803dec4d6a84fae3821da7ac7577080ef75451294e71f9b20e0ab1e7b", fieldLabel:"PREV_TXID (0x0E)", fieldColor:C.orange, visual:"prev_txid_0" },
  { phase:"creator", title:"Input 0: OUTPUT_INDEX", desc:"Key-type=0F (PSBT_IN_OUTPUT_INDEX). Value = 00000000 (vout 0). Together with PREVIOUS_TXID, this uniquely identifies the UTXO. In v0, the txid+vout were packed inside the unsigned tx's input array. Here they're individual key-value pairs.", action:"click", hexAdd:"010f0400000000", fieldLabel:"OUTPUT_INDEX (0x0F)", fieldColor:C.orange, visual:"prev_vout_0" },
  { phase:"creator", title:"Close Input 0 Map", desc:"0x00 separator. Input 0's map has just PREVIOUS_TXID + OUTPUT_INDEX. No sequence (defaults to 0xFFFFFFFF). No scriptSig at all — remember, v0 had an EMPTY scriptSig (00) in the unsigned tx. V2 doesn't even have that concept — there's no tx blob to put it in.", action:"click", hexAdd:"00", fieldLabel:"INPUT 0: close", fieldColor:C.dim, visual:"sep_in0" },
  // ── OUTPUT 0 MAP: amount + script live here ──
  { phase:"creator", title:"Output 0: AMOUNT (Bob)", desc:"Key-type=03 (PSBT_OUT_AMOUNT). Value = 1027000000000000 (10,000 sats, 8-byte LE). In v0 this was inside the unsigned tx's output array. In v2 it's a standalone field. This means you can add/remove outputs without touching other maps.", action:"click", hexAdd:"0103081027000000000000", fieldLabel:"OUT 0 AMT: 10,000", fieldColor:C.green, visual:"out0_amount" },
  { phase:"creator", title:"Output 0: SCRIPT (Bob)", desc:"Key-type=04 (PSBT_OUT_SCRIPT). Value = 0014d85c2b71... (22-byte P2WPKH). The actual scriptPubKey. Value-length = 16 (22 bytes). Same script data as v0, just stored differently — as a first-class PSBT field instead of buried in a tx blob.", action:"click", hexAdd:"0104160014d85c2b71d0060b09c9886aeb815e50991dda124d", fieldLabel:"OUT 0 SCRIPT: P2WPKH", fieldColor:C.blue, visual:"out0_script" },
  { phase:"creator", title:"Close Output 0 Map", desc:"0x00 separator. Output 0 has AMOUNT + SCRIPT — everything needed to reconstruct this output in the final transaction.", action:"click", hexAdd:"00", fieldLabel:"OUTPUT 0: close", fieldColor:C.dim, visual:"sep_out0" },
  // ── OUTPUT 1 MAP ──
  { phase:"creator", title:"Output 1: AMOUNT (change)", desc:"PSBT_OUT_AMOUNT = d85e010000000000 (89,800 sats). Alice's change.", action:"click", hexAdd:"010308d85e010000000000", fieldLabel:"OUT 1 AMT: 89,800", fieldColor:C.green, visual:"out1_amount" },
  { phase:"creator", title:"Output 1: SCRIPT (change)", desc:"PSBT_OUT_SCRIPT = P2WPKH to Alice's change address. Same 22-byte script.", action:"click", hexAdd:"010416001400aea9a2e5f0f876a588df5546e8742d1d87008f", fieldLabel:"OUT 1 SCRIPT: P2WPKH", fieldColor:C.blue, visual:"out1_script" },
  { phase:"creator", title:"Close Output 1 Map", desc:"0x00 separator — end of the PSBT! Compare with v0: no locktime field here (defaults to 0). No empty scriptSigs. No output count inside a tx blob. Every piece of data is a proper key-value pair in the right map.", action:"click", hexAdd:"00", fieldLabel:"OUTPUT 1: close", fieldColor:C.dim, visual:"sep_out1" },
  { phase:"creator_done", title:"Creator Phase Complete! (v2)", desc:"The v2 PSBT is structurally different from v0 but carries the same information. Key differences you just built:\n\n1. No UNSIGNED_TX blob — tx data decomposed into maps\n2. PREVIOUS_TXID + OUTPUT_INDEX in input maps (not a tx blob)\n3. AMOUNT + SCRIPT in output maps (not a tx blob)\n4. VERSION=2, TX_VERSION, INPUT_COUNT, OUTPUT_COUNT as explicit global fields\n5. TX_MODIFIABLE flag (v2-only) controls mutability\n\nSame Updater/Signer/Finalizer flow follows.", hexAdd:"", visual:"creator_complete" },
  // ── UPDATER (same fields as v0) ──
  { phase:"updater", title:"Updater: Rewind to Input 0", desc:"The Updater adds WITNESS_UTXO and BIP32_DERIVATION — exactly the same as v0. These metadata fields are identical across versions. The Updater doesn't care whether the tx data came from an unsigned tx blob or decomposed fields.", hexAdd:"", visual:"updater_rewind", hexReplace:{removeTrailing:3, desc:"Remove 3 trailing 0x00 separators"} },
  { phase:"updater", title:"WITNESS_UTXO (same as v0)", desc:"Key-type=01, same PSBT_IN_WITNESS_UTXO. 100,000 sats + P2WPKH script. This field is version-agnostic — works identically in v0 and v2. The signer needs the amount for BIP-143 sighash.", action:"click", hexAdd:"01011aa086010000000000160014d85c2b71d0060b09c9886aeb815e50991dda124d", fieldLabel:"WITNESS_UTXO", fieldColor:C.green, visual:"witness_utxo_val" },
  { phase:"updater", title:"BIP32_DERIVATION (same as v0)", desc:"Key-type=06 + pubkey, value = fingerprint + path m/84'/0'/0'/0/7. Identical to v0 — the hardware wallet doesn't care about PSBT version for key derivation.", action:"click", hexAdd:"22060279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179818d90c6a4f5400008000000080000000800000000007000000", fieldLabel:"BIP32: m/84'/0'/0'/0/7", fieldColor:C.amber, visual:"bip32_val" },
  { phase:"updater", title:"Close All Maps (updated)", desc:"Close input 0 + two output maps. Same separator structure.", action:"click", hexAdd:"000000", fieldLabel:"3x SEPARATOR", fieldColor:C.dim, visual:"close_all" },
  { phase:"updater_done", title:"Updater Phase Complete!", desc:"Input 0 now has: PREVIOUS_TXID + OUTPUT_INDEX (from Creator) + WITNESS_UTXO + BIP32_DERIVATION (from Updater). The signing metadata is version-agnostic.", hexAdd:"", visual:"updater_complete" },
  // ── SIGNER ──
  { phase:"signer", title:"Signer: Rewind to Input 0", desc:"The hardware wallet reads the v2 PSBT. It reconstructs the transaction mentally from decomposed fields to compute the fee. Same display: \"Send 10,000 sats? Fee: 200 sats.\" The BIP-143 sighash computation is identical to v0.", hexAdd:"", visual:"signer_rewind", hexReplace:{removeTrailing:3, desc:"Remove 3 trailing separators"} },
  { phase:"signer", title:"PARTIAL_SIG (same as v0)", desc:"Key-type=02 + pubkey. The signature itself is version-agnostic — same ECDSA DER format, same BIP-143 sighash algorithm. The signer doesn't need to know whether it's signing a v0 or v2 PSBT.", action:"click", hexAdd:"22020279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798473044022057b5f2739b2acf4706085e5f1378eab397e25e95666c50951a3d3f02a7dc3ab50220173c3f4f2f1be24cc2e97ad3a1b4f6c5e85d7a0f25e6abbe3be7db2c1ae32dfe01", fieldLabel:"PARTIAL_SIG (71B)", fieldColor:C.red, visual:"partial_sig_val" },
  { phase:"signer", title:"Close All Maps (signed)", desc:"Close input 0 + two output maps.", action:"click", hexAdd:"000000", fieldLabel:"3x SEPARATOR", fieldColor:C.dim, visual:"close_signed" },
  { phase:"signer_done", title:"Signer Phase Complete!", desc:"Signed. The PARTIAL_SIG is byte-for-byte identical to the v0 version. The signature doesn't encode PSBT version — it commits to the transaction data (inputs, outputs, amounts) regardless of how that data was stored in the PSBT.", hexAdd:"", visual:"signer_complete" },
  // ── FINALIZER + EXTRACTOR ──
  { phase:"finalizer", title:"Finalizer: Build Witness", desc:"Same finalization as v0: FINAL_SCRIPTWITNESS = [<sig>, <pubkey>]. Strip non-final fields. The Finalizer is version-agnostic.", hexAdd:"", visual:"finalizer_explain" },
  { phase:"extractor", title:"Extractor: Reconstruct & Broadcast!", desc:"HERE is where v2 extraction differs from v0:\n\nv0 Extractor: takes the existing UNSIGNED_TX blob, inserts witnesses, done.\n\nv2 Extractor: RECONSTRUCTS the unsigned tx from decomposed fields — reads TX_VERSION from global, PREVIOUS_TXID + OUTPUT_INDEX + SEQUENCE from each input map, AMOUNT + SCRIPT from each output map, computes locktime from per-input constraints. Then inserts witnesses into the reconstructed tx.\n\nSame final broadcast transaction either way.", hexAdd:"", visual:"extractor_explain" },
];

// V2 Multi: 2-in 3-out using BIP-370
const V2_MULTI_STEPS = [
  { phase:"setup", title:"The Scenario (v2 Multi)", desc:"Same 2-in 3-out transaction: Alice spends UTXO A (50k sats) + UTXO B (80k sats) to pay Bob (45k) + Carol (30k) + change (54.5k). Fee: 500 sats. Now in PSBTv2. Watch how each input and output is self-contained — you could add a third input or fourth output without touching existing maps.", hexAdd:"", visual:"scenario" },
  // ── MAGIC ──
  { phase:"creator", title:"Write Magic Bytes", desc:"Same 5 bytes. Always.", action:"click", hexAdd:"70736274ff", fieldLabel:"MAGIC", fieldColor:C.red, visual:"magic" },
  // ── GLOBAL MAP ──
  { phase:"creator", title:"Global: VERSION = 2", desc:"PSBT_GLOBAL_VERSION = 2. Required. Without this, a parser would look for UNSIGNED_TX (type 0x00) in the global map and fail.", action:"click", hexAdd:"01fb0402000000", fieldLabel:"VERSION: 2", fieldColor:C.cyan, visual:"global_version" },
  { phase:"creator", title:"Global: TX_VERSION = 2", desc:"PSBT_GLOBAL_TX_VERSION = 2. The Bitcoin transaction version, now a standalone field.", action:"click", hexAdd:"01020402000000", fieldLabel:"TX_VERSION: 2", fieldColor:C.purple, visual:"tx_version" },
  { phase:"creator", title:"Global: INPUT_COUNT = 2", desc:"PSBT_GLOBAL_INPUT_COUNT = 2. Two inputs. In a CoinJoin scenario, this would start at 0 and increment as participants register.", action:"click", hexAdd:"01040102", fieldLabel:"INPUT_COUNT: 2", fieldColor:C.green, visual:"input_count" },
  { phase:"creator", title:"Global: OUTPUT_COUNT = 3", desc:"PSBT_GLOBAL_OUTPUT_COUNT = 3. Three outputs. Together with INPUT_COUNT, this replaces the varint counts that were inside the v0 unsigned tx blob.", action:"click", hexAdd:"01050103", fieldLabel:"OUTPUT_COUNT: 3", fieldColor:C.green, visual:"output_count" },
  { phase:"creator", title:"Global: TX_MODIFIABLE = 0x00", desc:"Locked — no more inputs or outputs can be added. In v0 this wasn't even possible to express. If Alice wanted to allow RBF fee-bumping by adding inputs later, she could set bit 0 (0x01).", action:"click", hexAdd:"01060100", fieldLabel:"TX_MODIFIABLE: 0x00", fieldColor:C.cyan, visual:"tx_modifiable" },
  { phase:"creator", title:"End Global Map", desc:"0x00 separator. The v2 global map has 5 simple fields. Compare with v0 which had one massive UNSIGNED_TX blob (185 bytes for this tx!). V2 global = ~27 bytes. The savings come from NOT duplicating data that lives in input/output maps.", action:"click", hexAdd:"00", fieldLabel:"SEPARATOR", fieldColor:C.dim, visual:"sep_global" },
  // ── INPUT 0 (UTXO A: 50k) ──
  { phase:"creator", title:"Input 0: PREVIOUS_TXID", desc:"PSBT_IN_PREVIOUS_TXID (0x0E). 32-byte TXID of UTXO A. This input map is self-contained — it carries its own outpoint data. In v0, this was byte 5-36 of the unsigned tx's first input. Here it's a first-class field.", action:"click", hexAdd:"010e20aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111", fieldLabel:"IN 0: PREV_TXID", fieldColor:C.orange, visual:"prev_txid_0" },
  { phase:"creator", title:"Input 0: OUTPUT_INDEX = 0", desc:"PSBT_IN_OUTPUT_INDEX (0x0F) = 0. Combined with the TXID, uniquely identifies UTXO A.", action:"click", hexAdd:"010f0400000000", fieldLabel:"IN 0: VOUT 0", fieldColor:C.orange, visual:"prev_vout_0" },
  { phase:"creator", title:"Input 0: SEQUENCE (RBF)", desc:"PSBT_IN_SEQUENCE (0x10) = feffffff (0xFFFFFFFE). In v0 this was inside the unsigned tx. In v2 it's a per-input field. If omitted, defaults to 0xFFFFFFFF. We explicitly set it for RBF.", action:"click", hexAdd:"011004feffffff", fieldLabel:"IN 0: SEQ (RBF)", fieldColor:C.dim, visual:"sequence_0" },
  { phase:"creator", title:"Close Input 0", desc:"0x00 separator. Input 0 map = PREVIOUS_TXID + OUTPUT_INDEX + SEQUENCE. Three fields, self-contained. No empty scriptSig — that concept doesn't exist in v2.", action:"click", hexAdd:"00", fieldLabel:"IN 0: close", fieldColor:C.dim, visual:"close_in0" },
  // ── INPUT 1 (UTXO B: 80k) ──
  { phase:"creator", title:"Input 1: PREVIOUS_TXID", desc:"32-byte TXID of UTXO B. Each input map is independent — you could reorder input 0 and input 1 without breaking anything (unlike v0 where input order was baked into the unsigned tx).", action:"click", hexAdd:"010e20bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222", fieldLabel:"IN 1: PREV_TXID", fieldColor:C.orange, visual:"prev_txid_1" },
  { phase:"creator", title:"Input 1: OUTPUT_INDEX = 2", desc:"UTXO B was at vout index 2. Same PSBT_IN_OUTPUT_INDEX field.", action:"click", hexAdd:"010f0402000000", fieldLabel:"IN 1: VOUT 2", fieldColor:C.orange, visual:"prev_vout_1" },
  { phase:"creator", title:"Input 1: SEQUENCE (RBF)", desc:"Same RBF sequence. Each input independently declares its sequence.", action:"click", hexAdd:"011004feffffff", fieldLabel:"IN 1: SEQ (RBF)", fieldColor:C.dim, visual:"sequence_1" },
  { phase:"creator", title:"Close Input 1", desc:"0x00 separator. Both input maps now have their outpoint data.", action:"click", hexAdd:"00", fieldLabel:"IN 1: close", fieldColor:C.dim, visual:"close_in1" },
  // ── OUTPUT 0 (Bob: 45k) ──
  { phase:"creator", title:"Output 0: AMOUNT (Bob)", desc:"PSBT_OUT_AMOUNT (0x03) = c8af000000000000 (45,000 sats). In v0 this was bytes inside the unsigned tx output array. In v2 it's a standalone field. You could add a 4th output without touching Bob's output map.", action:"click", hexAdd:"010308c8af000000000000", fieldLabel:"OUT 0: 45,000 sats", fieldColor:C.green, visual:"out0_amount" },
  { phase:"creator", title:"Output 0: SCRIPT (Bob)", desc:"PSBT_OUT_SCRIPT (0x04) = P2WPKH to Bob. 22-byte script.", action:"click", hexAdd:"0104160014d85c2b71d0060b09c9886aeb815e50991dda124d", fieldLabel:"OUT 0: P2WPKH (Bob)", fieldColor:C.blue, visual:"out0_script" },
  { phase:"creator", title:"Close Output 0", desc:"0x00 separator.", action:"click", hexAdd:"00", fieldLabel:"OUT 0: close", fieldColor:C.dim, visual:"sep_out0" },
  // ── OUTPUT 1 (Carol: 30k) ──
  { phase:"creator", title:"Output 1: AMOUNT (Carol)", desc:"30,000 sats. PSBT_OUT_AMOUNT.", action:"click", hexAdd:"0103083075000000000000", fieldLabel:"OUT 1: 30,000 sats", fieldColor:C.green, visual:"out1_amount" },
  { phase:"creator", title:"Output 1: SCRIPT (Carol)", desc:"P2WPKH to Carol.", action:"click", hexAdd:"0104160014a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", fieldLabel:"OUT 1: P2WPKH (Carol)", fieldColor:C.blue, visual:"out1_script" },
  { phase:"creator", title:"Close Output 1", desc:"0x00 separator.", action:"click", hexAdd:"00", fieldLabel:"OUT 1: close", fieldColor:C.dim, visual:"sep_out1" },
  // ── OUTPUT 2 (Alice change: 54.5k) ──
  { phase:"creator", title:"Output 2: AMOUNT (change)", desc:"54,500 sats. Alice's change.", action:"click", hexAdd:"01030814d5000000000000", fieldLabel:"OUT 2: 54,500 sats", fieldColor:C.green, visual:"out2_amount" },
  { phase:"creator", title:"Output 2: SCRIPT (change)", desc:"P2WPKH to Alice's change address.", action:"click", hexAdd:"010416001400aea9a2e5f0f876a588df5546e8742d1d87008f", fieldLabel:"OUT 2: P2WPKH (change)", fieldColor:C.blue, visual:"out2_script" },
  { phase:"creator", title:"Close Output 2", desc:"Final 0x00 separator. The PSBT is complete. Compare map structure:\n\nv0: magic + [UNSIGNED_TX(185B)] + 0x00 + [empty] + 0x00 + [empty] + 0x00 + ... \nv2: magic + [VERSION+TX_VER+COUNTS+FLAGS] + 0x00 + [TXID+VOUT+SEQ] + 0x00 + [TXID+VOUT+SEQ] + 0x00 + [AMT+SCRIPT] + 0x00 + ...\n\nV2 distributes data to where it belongs.", action:"click", hexAdd:"00", fieldLabel:"OUT 2: close", fieldColor:C.dim, visual:"sep_out2" },
  { phase:"creator_done", title:"Creator Phase Complete! (v2)", desc:"The v2 PSBT has the same logical content as the v0 version but with decomposed structure. Each input carries its own TXID+VOUT. Each output carries its own AMOUNT+SCRIPT. No monolithic tx blob.\n\nThis means:\n- Adding input 2 = just append a new input map + bump INPUT_COUNT\n- Removing output 1 = remove its map + decrement OUTPUT_COUNT\n- Reordering inputs = swap input maps\n\nNone of these require re-serializing a transaction.", hexAdd:"", visual:"creator_complete" },
  // ── UPDATER ──
  { phase:"updater", title:"Updater: Rewind to Input 0", desc:"Remove the trailing separators. The Updater adds WITNESS_UTXO and BIP32 to both inputs — same as v0.", hexAdd:"", visual:"updater_rewind", hexReplace:{removeTrailing:5, desc:"Remove 5 trailing separators"} },
  { phase:"updater", title:"Input 0: WITNESS_UTXO + BIP32", desc:"WITNESS_UTXO (50,000 sats + script) and BIP32_DERIVATION (m/84'/0'/0'/0/3). Identical fields to v0 — the Updater's job doesn't change between versions.", action:"click", hexAdd:"01011a50c3000000000000160014d85c2b71d0060b09c9886aeb815e50991dda124d22060279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179818d90c6a4f540000800000008000000080000000000300000000", fieldLabel:"IN 0: UTXO + BIP32", fieldColor:C.green, visual:"wu_val_0" },
  { phase:"updater", title:"Close Input 0", desc:"0x00 separator.", action:"click", hexAdd:"00", fieldLabel:"IN 0: close", fieldColor:C.dim, visual:"close_in0_u" },
  { phase:"updater", title:"Input 1: WITNESS_UTXO + BIP32", desc:"WITNESS_UTXO (80,000 sats) + BIP32 (m/84'/0'/0'/0/11) for input 1.", action:"click", hexAdd:"01011a80380100000000000160014a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b222060379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179818d90c6a4f5400008000000080000000800000000b0b00000000", fieldLabel:"IN 1: UTXO + BIP32", fieldColor:C.green, visual:"wu_val_1" },
  { phase:"updater", title:"Close Input 1 + Outputs", desc:"Close input 1 + three output maps.", action:"click", hexAdd:"00000000", fieldLabel:"4x SEPARATOR", fieldColor:C.dim, visual:"close_all" },
  { phase:"updater_done", title:"Updater Phase Complete!", desc:"Both inputs enriched with WITNESS_UTXO + BIP32. The input maps now contain BOTH the v2 Creator data (PREVIOUS_TXID, OUTPUT_INDEX, SEQUENCE) AND the Updater data (WITNESS_UTXO, BIP32). Everything the signer needs is in each input map.", hexAdd:"", visual:"updater_complete" },
  // ── SIGNER ──
  { phase:"signer", title:"Signer: Rewind to Input 0", desc:"Hardware wallet reconstructs the transaction from decomposed fields, verifies fee (500 sats), displays outputs. Signs both inputs.", hexAdd:"", visual:"signer_rewind", hexReplace:{removeTrailing:4, desc:"Remove 4 trailing separators"} },
  { phase:"signer", title:"Input 0: PARTIAL_SIG", desc:"ECDSA signature for input 0. Same DER format, same sighash, same key type 0x02. The signature is version-agnostic.", action:"click", hexAdd:"22020279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798473044022057b5f2739b2acf4706085e5f1378eab397e25e95666c50951a3d3f02a7dc3ab50220173c3f4f2f1be24cc2e97ad3a1b4f6c5e85d7a0f25e6abbe3be7db2c1ae32dfe01", fieldLabel:"IN 0: SIG (71B)", fieldColor:C.red, visual:"sig_val_0" },
  { phase:"signer", title:"Close Input 0 (signed)", desc:"0x00.", action:"click", hexAdd:"00", fieldLabel:"IN 0: close", fieldColor:C.dim, visual:"close_signed_0" },
  { phase:"signer", title:"Input 1: PARTIAL_SIG", desc:"ECDSA signature for input 1. Different sighash (different outpoint), different private key, different signature.", action:"click", hexAdd:"22020379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179847304402201a2b3c4d5e6f708192a3b4c5d6e7f80a1b2c3d4e5f607182939495a6b7c8d9022019283746556473829104a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f01", fieldLabel:"IN 1: SIG (71B)", fieldColor:C.red, visual:"sig_val_1" },
  { phase:"signer", title:"Close Input 1 + Outputs", desc:"Close all remaining maps. Both inputs signed.", action:"click", hexAdd:"00000000", fieldLabel:"4x SEPARATOR", fieldColor:C.dim, visual:"close_signed" },
  { phase:"signer_done", title:"Signer Phase Complete!", desc:"Both inputs signed. The signatures are identical to what the v0 signer would produce — same transaction data, same sighash, same keys. Only the PSBT container differs.", hexAdd:"", visual:"signer_complete" },
  // ── FINALIZER + EXTRACTOR ──
  { phase:"finalizer", title:"Finalizer: Build Witnesses", desc:"Same finalization: Input 0 witness = [sig_A, pubkey_A], Input 1 witness = [sig_B, pubkey_B]. Strip non-final fields. Version-agnostic.", hexAdd:"", visual:"finalizer_explain" },
  { phase:"extractor", title:"Extractor: Reconstruct & Broadcast!", desc:"The v2 Extractor does MORE work than v0:\n\n1. Read TX_VERSION from global map\n2. For each input: read PREVIOUS_TXID + OUTPUT_INDEX + SEQUENCE\n3. For each output: read AMOUNT + SCRIPT\n4. Compute locktime from FALLBACK_LOCKTIME and per-input constraints\n5. Build the unsigned transaction from scratch\n6. Insert finalized witnesses\n7. Serialize and broadcast\n\nThe resulting broadcast transaction is BIT-FOR-BIT IDENTICAL to the v0 version. The PSBT version only affects how data is stored — not what transaction gets broadcast.", hexAdd:"", visual:"extractor_explain" },
];

const SCENARIOS = [
  {
    id: "simple",
    title: "v0: Simple 1-in 2-out",
    subtitle: "Alice sends to Bob",
    emoji: "1",
    color: C.green,
    version: 0,
    steps: SIMPLE_STEPS,
    scene: {
      inputs: [{ label:"Alice's UTXO", amount:100000, type:"P2WPKH", path:"m/84'/0'/0'/0/7" }],
      outputs: [
        { label:"Bob", amount:10000, color:C.blue },
        { label:"Alice (change)", amount:89800, color:C.teal },
      ],
      fee: 200,
    },
    jumps: [
      { label:"Start", idx:0 }, { label:"Magic", idx:1 }, { label:"Tx Start", idx:4 },
      { label:"Input", idx:6 }, { label:"Outputs", idx:10 }, { label:"Creator Done", idx:20 },
      { label:"Updater", idx:21 }, { label:"Signer", idx:28 }, { label:"Final", idx:33 },
    ],
  },
  {
    id: "multi",
    title: "v0: 2-in 3-out",
    subtitle: "Alice pays Bob + Carol",
    emoji: "2",
    color: C.purple,
    version: 0,
    steps: MULTI_STEPS,
    scene: {
      inputs: [
        { label:"UTXO A", amount:50000, type:"P2WPKH", path:"m/84'/0'/0'/0/3" },
        { label:"UTXO B", amount:80000, type:"P2WPKH", path:"m/84'/0'/0'/0/11" },
      ],
      outputs: [
        { label:"Bob", amount:45000, color:C.blue },
        { label:"Carol", amount:30000, color:C.purple },
        { label:"Alice (change)", amount:54500, color:C.teal },
      ],
      fee: 500,
    },
    jumps: [
      { label:"Start", idx:0 }, { label:"Magic", idx:1 }, { label:"Input 0", idx:6 },
      { label:"Input 1", idx:11 }, { label:"Outputs", idx:15 }, { label:"Creator Done", idx:30 },
      { label:"Updater", idx:31 }, { label:"IN 0 meta", idx:32 }, { label:"IN 1 meta", idx:36 },
      { label:"Signer", idx:42 }, { label:"Final", idx:52 },
    ],
  },
  {
    id: "v2simple",
    title: "v2: Simple 1-in 2-out",
    subtitle: "Same tx, decomposed format",
    emoji: "1",
    color: C.cyan,
    version: 2,
    steps: V2_SIMPLE_STEPS,
    scene: {
      inputs: [{ label:"Alice's UTXO", amount:100000, type:"P2WPKH", path:"m/84'/0'/0'/0/7" }],
      outputs: [
        { label:"Bob", amount:10000, color:C.blue },
        { label:"Alice (change)", amount:89800, color:C.teal },
      ],
      fee: 200,
    },
    jumps: [
      { label:"Start", idx:0 }, { label:"Magic", idx:1 }, { label:"Global", idx:2 },
      { label:"Input 0", idx:8 }, { label:"Outputs", idx:11 }, { label:"Creator Done", idx:17 },
      { label:"Updater", idx:18 }, { label:"Signer", idx:23 }, { label:"Final", idx:27 },
    ],
  },
  {
    id: "v2multi",
    title: "v2: 2-in 3-out",
    subtitle: "Multi-pay, decomposed",
    emoji: "2",
    color: C.teal,
    version: 2,
    steps: V2_MULTI_STEPS,
    scene: {
      inputs: [
        { label:"UTXO A", amount:50000, type:"P2WPKH", path:"m/84'/0'/0'/0/3" },
        { label:"UTXO B", amount:80000, type:"P2WPKH", path:"m/84'/0'/0'/0/11" },
      ],
      outputs: [
        { label:"Bob", amount:45000, color:C.blue },
        { label:"Carol", amount:30000, color:C.purple },
        { label:"Alice (change)", amount:54500, color:C.teal },
      ],
      fee: 500,
    },
    jumps: [
      { label:"Start", idx:0 }, { label:"Magic", idx:1 }, { label:"Global", idx:2 },
      { label:"Input 0", idx:9 }, { label:"Input 1", idx:13 }, { label:"Outputs", idx:18 },
      { label:"Creator Done", idx:30 }, { label:"Updater", idx:31 },
      { label:"Signer", idx:37 }, { label:"Final", idx:44 },
    ],
  },
];

// ━━━ ANIMATED UTXO BOX ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UTXOBox({ label, amount, color, glow, mini, type, badge, badgeColor }) {
  return (
    <div style={{
      padding: mini ? "6px 10px" : "12px 16px",
      borderRadius: 10,
      background: color + "10",
      border: `2px solid ${color}${glow ? "90" : "40"}`,
      boxShadow: glow ? `0 0 20px ${color}30, 0 0 40px ${color}15` : "none",
      transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{ fontSize: mini ? 9 : 11, fontWeight: 800, color, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: mini ? 12 : 17, fontWeight: 800, color: C.text, fontFamily: "'JetBrains Mono',monospace" }}>
        {typeof amount === "number" ? amount.toLocaleString() : amount} <span style={{ fontSize: mini ? 8 : 10, color: C.dim }}>sats</span>
      </div>
      {type && <div style={{ fontSize: 9, color: C.dim, marginTop: 1 }}>{type}</div>}
      {badge && <div style={{ marginTop: 3, padding:"2px 8px", borderRadius:4, background:(badgeColor||C.amber)+"10", border:`1px solid ${badgeColor||C.amber}30`, fontSize:9, fontWeight:700, color:badgeColor||C.amber, display:"inline-block" }}>{badge}</div>}
    </div>
  );
}

// ━━━ ANIMATED SCENE (now scenario-aware) ━━━━━━━━━━━━━━━━━━━━━━━━━

function AnimatedScene({ step, stepIndex, scenario, totalSteps }) {
  const phase = step.phase;
  const vis = step.visual;
  const { inputs, outputs, fee } = scenario.scene;

  const phaseColors = {
    setup:C.dim, creator:C.amber, creator_done:C.amber,
    updater:C.blue, updater_done:C.blue,
    signer:C.green, signer_done:C.green,
    finalizer:C.orange, extractor:C.cyan,
  };
  const pc = phaseColors[phase] || C.dim;

  // Progress thresholds (approximate via phase)
  const inCreator = phase === "creator" || phase === "creator_done";
  const inUpdater = phase === "updater" || phase === "updater_done";
  const inSigner = phase === "signer" || phase === "signer_done";
  const inFinalizer = phase === "finalizer";
  const inExtractor = phase === "extractor";
  const pastCreator = !inCreator && phase !== "setup";
  const pastUpdater = inSigner || inFinalizer || inExtractor;
  const pastSigner = inFinalizer || inExtractor;

  // Which input/output is being actively referenced? Check visual tag
  const activeIn0 = vis?.includes("_0") || vis?.includes("in0") || vis?.includes("input_0");
  const activeIn1 = vis?.includes("_1") || vis?.includes("in1") || vis?.includes("input_1");

  return (
    <div style={{
      position: "relative", height: 240, background: "#050910",
      borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", padding: 16,
    }}>
      {/* Phase label */}
      <div style={{
        position:"absolute", top:8, right:12, fontSize:9, fontWeight:700, color:pc,
        textTransform:"uppercase", letterSpacing:"0.1em",
        background:pc+"15", padding:"2px 8px", borderRadius:5,
      }}>
        {phase.replace("_done","").replace("_"," ")}
      </div>

      {/* INPUTS — left side */}
      <div style={{
        position:"absolute", left:14, top:16, display:"flex", flexDirection:"column", gap:6,
        transform: pastCreator ? "scale(0.88)" : "scale(1)",
        transformOrigin: "top left",
        opacity: pastSigner ? 0.35 : 1,
        transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {inputs.map((inp, i) => {
          const isActive = (i === 0 && activeIn0) || (i === 1 && activeIn1) ||
            (vis?.includes("witness_utxo") && !vis.includes("_1") && i === 0) ||
            (vis?.includes("witness_utxo") && vis.includes("_1") && i === 1);
          const hasUpdater = pastCreator && (i === 0 ? !vis?.includes("wu_key_1") || pastUpdater : pastUpdater);
          const hasSig = pastUpdater && (
            i === 0 ? (vis?.includes("sig_val_0") || vis?.includes("close_signed_0") || vis?.includes("sig_key_1") || vis?.includes("sig_val_1") || vis?.includes("close_signed") || pastSigner) :
            (vis?.includes("sig_val_1") || vis?.includes("close_signed") || pastSigner)
          );
          return (
            <UTXOBox key={i} label={inp.label} amount={inp.amount}
              color={hasUpdater ? C.green : C.orange} type={inp.type} mini={inputs.length > 1}
              glow={isActive}
              badge={hasSig ? "SIGNED" : hasUpdater ? inp.path : null}
              badgeColor={hasSig ? C.red : C.amber}
            />
          );
        })}
      </div>

      {/* Arrow */}
      {phase !== "setup" && (
        <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)" }}>
          <svg width="50" height="24" viewBox="0 0 50 24">
            <defs>
              <linearGradient id={`ag_${scenario.id}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={C.orange}/>
                <stop offset="100%" stopColor={C.green}/>
              </linearGradient>
            </defs>
            <path d="M4 12 L38 12 M34 6 L42 12 L34 18" stroke={`url(#ag_${scenario.id})`} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* OUTPUTS — right side */}
      {(vis?.includes("out") || vis?.includes("output_count") || pastCreator || vis === "locktime" || vis === "sep_global" || vis?.includes("sep_") || vis?.includes("creator_complete") || vis?.includes("close") || vis?.includes("updater") || vis?.includes("wu_") || vis?.includes("bip32") || vis?.includes("sig_") || vis?.includes("signer") || vis?.includes("finalizer") || vis?.includes("extractor")) && (
        <div style={{
          position:"absolute", right:14, top:12, display:"flex", flexDirection:"column", gap:5,
          animation: "fadeIn 0.4s ease",
        }}>
          {outputs.map((out, i) => {
            const isActive = vis === `out${i}_amount` || vis === `out${i}_script`;
            return (
              <UTXOBox key={i} label={out.label} amount={out.amount} color={out.color} mini glow={isActive} />
            );
          })}
          <div style={{ textAlign:"right", fontSize:9, fontWeight:700, color:C.red, padding:"1px 4px" }}>
            Fee: {fee.toLocaleString()} sats
          </div>
        </div>
      )}

      {/* Finalized / broadcast badge */}
      {(inFinalizer || inExtractor) && (
        <div style={{
          position:"absolute", left:"50%", bottom:14, transform:"translateX(-50%)",
          padding:"6px 20px", borderRadius:8,
          background: inExtractor ? C.cyan+"15" : C.orange+"15",
          border: `2px solid ${inExtractor ? C.cyan : C.orange}50`,
          fontSize:12, fontWeight:800, color: inExtractor ? C.cyan : C.orange,
          animation:"fadeIn 0.4s ease",
        }}>
          {inExtractor ? "BROADCAST READY" : "FINALIZING..."}
        </div>
      )}

      {/* Step counter */}
      <div style={{ position:"absolute", bottom:8, left:12, fontSize:9, color:C.dim }}>
        Step {stepIndex+1} / {totalSteps}
      </div>
    </div>
  );
}

// ━━━ HEX DISPLAY (live building) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function LiveHex({ hex, segments, highlightLast }) {
  const containerRef = useRef(null);
  const bytes = useMemo(() => hex.match(/.{1,2}/g) || [], [hex]);
  const colorMap = useMemo(() => {
    const m = new Array(bytes.length).fill(null);
    segments.forEach(seg => {
      for (let i = seg.start; i < Math.min(seg.end, bytes.length); i++) m[i] = seg;
    });
    return m;
  }, [bytes, segments]);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [hex]);

  const lastSeg = segments.length > 0 ? segments[segments.length - 1] : null;

  return (
    <div ref={containerRef} style={{
      background:"#050910", borderRadius:10, padding:14, border:`1px solid ${C.border}`,
      maxHeight:180, overflowY:"auto", lineHeight:2.1,
      fontFamily:"'JetBrains Mono',monospace", fontSize:11.5,
    }}>
      {bytes.length === 0
        ? <span style={{ color:C.dim, fontStyle:"italic" }}>Click "Next" to start building...</span>
        : bytes.map((b, i) => {
            const seg = colorMap[i];
            const isNew = highlightLast && lastSeg && i >= lastSeg.start && i < lastSeg.end;
            return (
              <span key={i} style={{
                display:"inline-block", padding:"1px 3px", margin:"1px",
                color: isNew ? "#fff" : (seg ? seg.color : C.dim),
                background: isNew ? (seg?.color||C.amber)+"35" : (seg ? seg.color+"0a" : "transparent"),
                borderRadius:3,
                borderBottom: `2px solid ${seg ? seg.color+(isNew?"90":"40") : "transparent"}`,
                transition:"all 0.15s",
                animation: isNew ? "fadeIn 0.3s ease" : "none",
              }}>{b}</span>
            );
          })
      }
    </div>
  );
}

// ━━━ FIELD LOG ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function FieldLog({ entries }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [entries]);
  return (
    <div ref={ref} style={{ display:"flex", flexDirection:"column", gap:3, maxHeight:160, overflowY:"auto", padding:"8px 0" }}>
      {entries.map((e, i) => (
        <div key={i} style={{
          display:"flex", alignItems:"center", gap:8, padding:"4px 10px", borderRadius:6,
          background:e.color+"08",
          animation: i === entries.length-1 ? "fadeIn 0.3s ease" : "none",
        }}>
          <span style={{ fontSize:9, fontWeight:700, color:"#000", background:e.color, borderRadius:3, padding:"1px 6px", minWidth:20, textAlign:"center" }}>{e.byteLen}</span>
          <span style={{ fontSize:11, fontWeight:700, color:e.color, flex:1, fontFamily:"'JetBrains Mono',monospace" }}>{e.label}</span>
          <span style={{ fontSize:10, color:C.dim }}>+{e.byteLen}B = {e.totalBytes}B</span>
        </div>
      ))}
    </div>
  );
}

// ━━━ MAIN GAME COMPONENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function PSBTBuilderGame() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [hex, setHex] = useState("");
  const [segments, setSegments] = useState([]);
  const [fieldLog, setFieldLog] = useState([]);
  const [highlightLast, setHighlightLast] = useState(false);

  const scenario = SCENARIOS[scenarioIdx];
  const steps = scenario.steps;
  const step = steps[stepIdx];
  const canNext = stepIdx < steps.length - 1;
  const canPrev = stepIdx > 0;

  const goToStep = useCallback((targetIdx, stepsArr) => {
    const useSteps = stepsArr || steps;
    let builtHex = "";
    const segs = [];
    const log = [];
    let bytePos = 0;
    for (let i = 0; i <= targetIdx; i++) {
      const s = useSteps[i];
      if (s.hexReplace) {
        const removeBytes = s.hexReplace.removeTrailing;
        builtHex = builtHex.slice(0, -(removeBytes * 2));
        bytePos -= removeBytes;
        while (segs.length > 0 && segs[segs.length-1].end > bytePos) segs.pop();
        while (log.length > 0 && log[log.length-1].totalBytes > bytePos) log.pop();
      }
      if (s.hexAdd) {
        const addBytes = s.hexAdd.length / 2;
        segs.push({ start:bytePos, end:bytePos+addBytes, color:s.fieldColor||C.dim, label:s.fieldLabel||s.title });
        log.push({ label:s.fieldLabel||s.title, color:s.fieldColor||C.dim, byteLen:addBytes, totalBytes:bytePos+addBytes });
        builtHex += s.hexAdd;
        bytePos += addBytes;
      }
    }
    setHex(builtHex);
    setSegments(segs);
    setFieldLog(log);
    setStepIdx(targetIdx);
    setHighlightLast(true);
    setTimeout(() => setHighlightLast(false), 800);
  }, [steps]);

  const handleNext = () => { if (canNext) goToStep(stepIdx + 1); };
  const handlePrev = () => { if (canPrev) goToStep(stepIdx - 1); };

  const switchScenario = (idx) => {
    setScenarioIdx(idx);
    setStepIdx(0);
    setHex("");
    setSegments([]);
    setFieldLog([]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); handleNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); handlePrev(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const phaseColors = {
    setup:C.dim, creator:C.amber, creator_done:C.amber,
    updater:C.blue, updater_done:C.blue,
    signer:C.green, signer_done:C.green,
    finalizer:C.orange, extractor:C.cyan,
  };
  const phaseLabels = {
    setup:"Setup", creator:"Creator", creator_done:"Creator",
    updater:"Updater", updater_done:"Updater",
    signer:"Signer", signer_done:"Signer",
    finalizer:"Finalizer", extractor:"Extractor",
  };
  const pc = phaseColors[step.phase] || C.dim;
  const phases = ["setup","creator","updater","signer","finalizer","extractor"];
  const currentPhaseBase = step.phase.replace("_done","");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Scenario selector — grouped by version */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[
          { label:"BIP-174 (v0)", ver:0, color:C.amber },
          { label:"BIP-370 (v2)", ver:2, color:C.cyan },
        ].map(grp => {
          const items = SCENARIOS.map((sc,i) => ({sc,i})).filter(({sc}) => sc.version === grp.ver);
          return (
            <div key={grp.ver}>
              <div style={{ fontSize:10, fontWeight:700, color:grp.color, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, paddingLeft:2 }}>
                {grp.label}
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {items.map(({sc, i}) => (
                  <button key={sc.id} onClick={() => switchScenario(i)} style={{
                    flex:1, minWidth:160, padding:"10px 14px", borderRadius:12, cursor:"pointer",
                    border: `2px solid ${scenarioIdx===i ? sc.color : C.border}`,
                    background: scenarioIdx===i ? sc.color+"12" : C.surface,
                    transition:"all 0.25s", fontFamily:"inherit", textAlign:"left",
                    display:"flex", alignItems:"center", gap:10,
                  }}>
                    <div style={{
                      width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
                      background: scenarioIdx===i ? sc.color+"25" : C.border+"60",
                      fontSize:14, fontWeight:900, color: scenarioIdx===i ? sc.color : C.dim,
                      border:`2px solid ${scenarioIdx===i ? sc.color+"50" : "transparent"}`,
                    }}>{sc.emoji}</div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:800, color: scenarioIdx===i ? sc.color : C.dim }}>{sc.title}</div>
                      <div style={{ fontSize:10, color:C.dim, marginTop:1 }}>{sc.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase progress */}
      <div style={{ display:"flex", gap:2, alignItems:"center", paddingTop:14 }}>
        {phases.map((p, i) => {
          const active = p === currentPhaseBase;
          const done = phases.indexOf(currentPhaseBase) > i;
          const pColor = phaseColors[p] || C.dim;
          return (
            <div key={p} style={{ display:"flex", alignItems:"center", flex:1 }}>
              <div style={{
                flex:1, height:6, borderRadius:3,
                background: done ? pColor : (active ? pColor+"60" : C.border),
                transition:"all 0.4s", position:"relative",
              }}>
                {active && <div style={{
                  position:"absolute", top:-20, left:"50%", transform:"translateX(-50%)",
                  fontSize:9, fontWeight:700, color:pColor, textTransform:"uppercase",
                  letterSpacing:"0.08em", whiteSpace:"nowrap",
                }}>{phaseLabels[p]}</div>}
              </div>
              {i < phases.length-1 && <div style={{ width:4 }}/>}
            </div>
          );
        })}
      </div>

      {/* Animated scene */}
      <AnimatedScene step={step} stepIndex={stepIdx} scenario={scenario} totalSteps={steps.length} />

      {/* Explanation card */}
      <div style={{
        padding:"18px 22px", borderRadius:12, background:pc+"08",
        border:`2px solid ${pc}30`, transition:"all 0.3s",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{
            width:30, height:30, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
            background:pc+"20", fontSize:13, fontWeight:900, color:pc,
          }}>{stepIdx+1}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:800, color:pc }}>{step.title}</div>
          </div>
          {step.fieldLabel && (
            <span style={{
              padding:"3px 10px", borderRadius:6, fontSize:10, fontWeight:700,
              background:(step.fieldColor||pc)+"15", color:step.fieldColor||pc,
              border:`1px solid ${(step.fieldColor||pc)}30`,
              fontFamily:"'JetBrains Mono',monospace",
            }}>{step.fieldLabel}</span>
          )}
        </div>
        <div style={{ fontSize:13, color:C.soft, lineHeight:1.85, whiteSpace:"pre-line" }}>{step.desc}</div>
        {step.hexAdd && (
          <div style={{
            marginTop:12, padding:"10px 14px", borderRadius:8,
            background:"#050910", border:`1px solid ${C.border}`,
          }}>
            <div style={{ fontSize:9, fontWeight:700, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
              Bytes added this step
            </div>
            <code style={{
              fontSize:12, color:step.fieldColor||pc,
              fontFamily:"'JetBrains Mono',monospace", wordBreak:"break-all", lineHeight:1.8,
            }}>{step.hexAdd.match(/.{1,2}/g)?.join(" ")}</code>
            <div style={{ fontSize:10, color:C.dim, marginTop:4 }}>
              {step.hexAdd.length/2} byte{step.hexAdd.length/2 !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Live hex view */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>
            Raw PSBT Hex ({Math.floor(hex.length/2)} bytes)
          </span>
          {hex && (
            <button onClick={() => navigator.clipboard?.writeText(hex)} style={{
              padding:"3px 10px", borderRadius:6, border:`1px solid ${C.border}`,
              background:"transparent", color:C.dim, fontSize:10, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit",
            }}>Copy</button>
          )}
        </div>
        <LiveHex hex={hex} segments={segments} highlightLast={highlightLast}/>
      </div>

      {/* Field log */}
      {fieldLog.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>
            Fields Added
          </div>
          <FieldLog entries={fieldLog}/>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0" }}>
        <button onClick={handlePrev} disabled={!canPrev} style={{
          padding:"10px 22px", borderRadius:10, fontWeight:700, fontSize:13,
          cursor: canPrev?"pointer":"default", background:"transparent",
          border:`2px solid ${canPrev?C.dim:C.border}`, color:canPrev?C.text:C.dim,
          fontFamily:"inherit", transition:"all 0.2s",
        }}>Back</button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:12, color:C.dim }}>{stepIdx+1} / {steps.length}</span>
          <span style={{ fontSize:11, color:C.dim }}>(arrow keys)</span>
        </div>
        <button onClick={handleNext} disabled={!canNext} style={{
          padding:"10px 26px", borderRadius:10, fontWeight:700, fontSize:13,
          cursor: canNext?"pointer":"default",
          background: canNext?pc:C.border, border:"none",
          color: canNext?"#000":C.dim, fontFamily:"inherit",
          transition:"all 0.2s", boxShadow: canNext?`0 4px 16px ${pc}30`:"none",
        }}>{step.action==="click" ? "Add Bytes" : canNext ? "Next" : "Done!"}</button>
      </div>

      {/* Quick jump */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, padding:"8px 0", borderTop:`1px solid ${C.border}` }}>
        <span style={{ fontSize:10, color:C.dim, alignSelf:"center", marginRight:6 }}>Jump:</span>
        {scenario.jumps.map(j => (
          <button key={j.label} onClick={() => goToStep(j.idx)} style={{
            padding:"3px 8px", borderRadius:5,
            border:`1px solid ${stepIdx===j.idx?pc:C.border}`,
            background: stepIdx===j.idx?pc+"15":"transparent",
            color: stepIdx===j.idx?pc:C.dim,
            fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
          }}>{j.label}</button>
        ))}
      </div>
    </div>
  );
}
