import Web3 from"web3";import EthTx from"ethereumjs-tx";import Big from"big.js";import tokens from"../tokens";import{AccountType,CoinType}from"../constants";import axios from"axios";const apiKeys=["EB9IXHJKA7W233MV4W7MSME7GTF564Y54R"],etherscanApiUrl={test:"https://api-rinkeby.etherscan.io/api",public:"https://api.etherscan.io/api"};class EthereumWallet{constructor(e,t={}){e&&this.setServer(e),this.option=t}setServer(e){e="wss://mainnet.infura.io/ws/v3/ef03818b6af741aea80bcdee661fdfa3",this.url=e,this.server=new Web3(new Web3.providers.WebsocketProvider(e))}destroy(){}isActivated(){return!0}getInstance(){return this.server}async getBalances(e,t=[]){this.setServer(this.url);let s=[],r=await this.server.eth.getBalance(e);s.push({code:CoinType.ETH,value:this.server.utils.fromWei(r,"ether")});for(const r of t){let t=await this._getTokenBalance(e,r);t&&s.push(t)}return s}async _getTokenBalance(e,t){let s=tokens.get(AccountType.ethereum);if(s[t]){let r=s[t],a=new this.server.eth.Contract(r.abi,r.address);return{value:await a.methods.balanceOf(e).call()/Math.pow(10,r.decimals),code:t,issuer:r.address}}return null}async getGasPriceForGwei(){let e=await this.server.eth.getGasPrice();return Web3.utils.fromWei(e,"gwei")}getTransactions(e,t={}){let s="test";this.url&&-1!=this.url.indexOf("mainnet.infura")&&(s="public");let r=`${etherscanApiUrl[s]}?module=account&apikey=${apiKeys[0]}&address=${e}`,a=tokens.get(AccountType.ethereum);if(t&&t.assetCode&&t.assetCode!=CoinType.ETH&&a[t.assetCode]){let e=a[t.assetCode];r+=`&action=tokentx&contractaddress=${e.address}`}else r+="&action=txlist";return Object.keys(t).forEach(e=>{"assetCode"!==e&&(r+=`&${e}=${t[e]}`)}),new Promise((e,t)=>{axios.get(r).then(t=>{"1"===t.data.status&&"OK"===t.data.message?e(t.data.result):e([])}).catch(e=>{t(e)})})}getTransaction(e){return this.setServer(this.url),this.server.eth.getTransaction(e)}async sendTransaction(e,t,s,r={}){this.setServer(this.url),e=`0x${e}`;const a=this.server.eth.accounts.privateKeyToAccount(e).address,i=r.gasPrice||await this.server.eth.getGasPrice(),n=r.gasLimit||21e3,o=await this.server.eth.getTransactionCount(a,"pending");let c,h,l;if(r.assetCode&&r.assetCode!==CoinType.ETH){let e=tokens.get(AccountType.ethereum)[r.assetCode],a=new this.server.eth.Contract(e.abi,e.address);h=e.address,c="0",l=a.methods.transfer(t,new Big(s).times(new Big(10).pow(e.decimals)).toFixed()).encodeABI()}else c=this.server.utils.toWei(s,"ether"),h=t,l="0x";const u={from:a,to:h,nonce:Web3.utils.toHex(o),gasPrice:Web3.utils.toHex(i),gasLimit:Web3.utils.toHex(n),value:Web3.utils.toHex(c),data:l};let d=Buffer.from(e.substr(2),"hex"),g=new EthTx(u);g.sign(d);let m=`0x${g.serialize().toString("hex")}`;return new Promise((e,t)=>{this.server.eth.sendSignedTransaction(m,(s,r)=>{s?(t(s),console.error(s)):(e(r),console.info("tx hash:"+r))})})}async isContract(e){return this.setServer(this.url),"0x"!==await this.server.eth.getCode(e)}isValidAddress(e){return Web3.utils.isAddress(e)}getAccount(e){let t=e.getWallet();return{secret:t.getPrivateKeyString().substring(2),address:t.getChecksumAddressString()}}getAccountFromSecret(e){return{secret:e,address:(new Web3).eth.accounts.privateKeyToAccount(this.handleSecret(e)).address}}handleSecret(e){return 0===e.indexOf("0x")&&e.length>64?e:`0x${e}`}getContractAbi(e){let t="test";this.url&&-1!=this.url.indexOf("mainnet.infura")&&(t="public");let s=`${etherscanApiUrl[t]}?module=contract&action=getabi&address=${e}&apikey=${apiKeys[0]}`;return new Promise((e,t)=>{axios.get(s).then(s=>{"1"===s.data.status&&"OK"===s.data.message?e(JSON.parse(s.data.result)):t(s.data.result)}).catch(e=>{t(e)})})}async getConfirmations(e){this.setServer(this.url);try{const t=await this.server.eth.getTransaction(e),s=await this.server.eth.getBlockNumber();return t?null===t.blockNumber?0:s-t.blockNumber:-1}catch(e){return console.log(e),e}}}export default EthereumWallet;
