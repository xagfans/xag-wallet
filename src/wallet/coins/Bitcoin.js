import bitcoin from"bitcoinjs-lib";import wif from"wif";import axios from"axios";import{CoinType}from"../constants";import coinSelect from"coinselect";import{usingNetwork}from"blockchain.info/pushtx";import Big from"big.js";class BitcoinWallet{constructor(t,e){this.option=e,t&&this.setServer(t)}setServer(t){this.url=t,"https://testnet.blockchain.info"===t?(this.network=bitcoin.networks.testnet,this.pushtxNetWork=3):"https://blockchain.info"===t&&(this.network=bitcoin.networks.bitcoin,this.pushtxNetWork=0)}destroy(){}isActivated(){return!0}getInstance(){return this.network}transfToBtc(t){return new Big(t).div(1e8).toString()}transfToSatoshi(t){return Number(new Big(t).times(1e8))}async getBalances(t){let e=`${this.url}/balance?active=${t}&cors=true`,r=await axios.get(e);if(200===r.status){let e=r.data[t];return[{value:this.transfToBtc(e.final_balance),code:CoinType.BTC}]}return[{value:"0",code:CoinType.BTC}]}getAccount(t,e){const r=bitcoin.bip32.fromSeed(Buffer.from(t,"hex"),this.network).derivePath(e);let o=bitcoin.ECPair.fromWIF(r.toWIF(),this.network);return this._getAccountFromECPair(o)}getAccountFromSecret(t){const e=this._getECPairFromSecret(t);return this._getAccountFromECPair(e)}_getAccountFromECPair(t){let{address:e}=bitcoin.payments.p2pkh({pubkey:t.publicKey,network:this.network});return{secret:wif.encode(128,Buffer.from(t.privateKey,"hex"),!0),address:e}}_getECPairFromSecret(t){const e=wif.decode(t.toString());return bitcoin.ECPair.fromPrivateKey(e.privateKey)}async sendTransaction(t,e,r={},o){let i=this.network,n=usingNetwork(this.pushtxNetWork);const s=wif.decode(t),a=bitcoin.ECPair.fromPrivateKey(s.privateKey,{network:i});let{address:c}=bitcoin.payments.p2pkh({pubkey:a.publicKey,network:i});return new Promise(async(t,s)=>{try{await axios.get(`${this.url}/unspent?active=${c}&cors=true`).then(u=>{if(200===u.status){let l=r.amount||0;"string"==typeof l&&(l=Number(l));let d=r.feeRate||35;"string"==typeof d&&(d=Number(d));let f=[{address:e,value:this.transfToSatoshi(l)}],h=u.data;"object"!=typeof u.data&&(h=JSON.parse(u.data)),h||s(new Error("no utxos back or error"));let p=h.unspent_outputs;if(p.length<=0)return console.error("no utxo"),void s(new Error("no utxo"));let{inputs:m,outputs:b,fee:w}=coinSelect(p,f,d);if(!w)return void s(new Error("fee too low"));if(!m||!b)return console.error(".inputs and .outputs are undefined because no solution was found"),void s(new Error("inputs and outputs are undefined because no solution was found"));console.log("transaction stat:");const g=new bitcoin.TransactionBuilder(i);m.forEach(t=>g.addInput(t.tx_hash_big_endian,t.tx_output_n)),b.forEach(t=>{t.address||(t.address=c),g.addOutput(t.address,t.value)});for(let t in m)g.sign(parseInt(t),a);console.log("transaction end:"),o?o(this.url,g.build().toHex(),t,s):n.pushtx(g.build().toHex()).then(e=>{t(e)}).catch(t=>{s(t)})}}).catch(function(t){s(t)})}catch(t){s(t)}})}async getTransactions(t,e={}){return new Promise(async(r,o)=>{try{e.limit||(e.limit=50),e.offset||(e.offset=0);let i=await axios.get(`${this.url}/multiaddr?active=${t}&offset=${e.offset}&n=${e.limit}&cors=true`);i&&r(i.data)}catch(t){o(t)}})}isValidAddress(t){try{return bitcoin.address.toOutputScript(t,this.network),!0}catch(t){return!1}}async getConfirmations(t){try{const e=await axios.get(`${this.url}/latestblock?cors=true`);return t.blockNumber?null===t.blockNumber?0:e.data.height-t.blockNumber+1:-1}catch(t){return console.log(t),t}}}export default BitcoinWallet;
