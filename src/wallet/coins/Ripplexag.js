import{RippleAPI}from"ripple-lib";import RippleAddress from"ripple-address-codec";import{AccountType,CoinType}from"../constants";import tradingPlatformConfig from"../config/trading-platform";import rippleKeypairs from"ripple-keypairs";import Big from"big.js";class RipplexagWallet{constructor(e,t={}){e&&this.setServer(e),this.option=t}setServer(e){this.url=e,this.server&&this.server.isConnected()||(this.server=new RippleAPI({server:e,maxFeeXRP:"0.05",timeout:1e4}))}destroy(){this.server&&this.server.isConnected()&&this.server.disconnect()}getInstance(){return this.server}async isActivated(e){return this.server.isConnected()||await this.server.connect(),new Promise(t=>{this.server.getAccountInfo(e).then(()=>{t(!0)}).catch(e=>{e.data&&"actNotFound"===e.data.error&&t(!1)})})}async getBalances(e){this.server.isConnected()||await this.server.connect();try{let t,r=await this.server.getBalances(e),i=[];r.forEach(e=>{e.currency===CoinType.XRP?t={code:CoinType.XAG,value:e.value}:i.push({code:e.currency,value:e.value,issuer:e.counterparty||""})});let s=await this.server.getAccountInfo(e);return t.frozenNative=20+5*s.ownerCount,i.unshift(t),i}catch(e){return[{value:"0",code:CoinType.XAG}]}}async isTrustAsset(e,t,r){if((CoinType.XRP===t||CoinType.XAG===t)&&!r)return!0;if(e&&r&&e===r)return!0;let i=await this.server.getTrustlines(e);return!(!i&&0===i.length)&&i.some(e=>e.specification.counterparty===r&&e.specification.currency===t&&"0"!==e.specification.limit)}getTransactions(e,t={}){return new Promise(async(r,i)=>{try{const s=(await this.server.getServerInfo()).completeLedgers.split(",")[0].split("-");let n={minLedgerVersion:Number(s[0]),maxLedgerVersion:Number(s[1])};t.excludeFailures=!0,n={...n,...t},r(await this.server.getTransactions(e,n))}catch(e){i(e)}})}sendTransaction(e,t,r,i={},s){const n=rippleKeypairs.deriveKeypair(e),a=rippleKeypairs.deriveAddress(n.publicKey),c={data:s,format:"text",type:"sign"};let o=i.assetCode||CoinType.XRP,u={source:{address:a,maxAmount:{value:r,currency:o}},destination:{address:t,amount:{value:r,currency:o}},memos:[c]};if(i.assetIssuer&&(u.destination.amount.counterparty=i.assetIssuer,u.source.maxAmount.counterparty=i.assetIssuer),""!==i.tag){let e=new Number(i.tag);u.destination.tag=e.valueOf()}return new Promise((t,r)=>{this.server.preparePayment(a,u).then(i=>{const{signedTransaction:s}=this.server.sign(i.txJSON,e);this.server.submit(s).then(e=>{t(e)}).catch(e=>{r(e)})})})}async changeTrust(e,t,r,i){const s=rippleKeypairs.deriveKeypair(e),n=rippleKeypairs.deriveAddress(s.publicKey),a={currency:t,counterparty:r,limit:i,ripplingDisabled:!0};return new Promise((t,r)=>{this.server.prepareTrustline(n,a).then(i=>{const{signedTransaction:s}=this.server.sign(i.txJSON,e);this.server.submit(s).then(e=>{t(e)}).catch(e=>{r(e)})})})}isValidAddress(e){return RippleAddress.isValidAddress(e)}isTradingPlatformAddress(e){return tradingPlatformConfig[AccountType.ripplexag][e]}getAccount(e){let t={entropy:e};const r=rippleKeypairs.generateSeed(t),i=rippleKeypairs.deriveKeypair(r);return{secret:r,address:rippleKeypairs.deriveAddress(i.publicKey)}}getAccountFromSecret(e){const t=rippleKeypairs.deriveKeypair(e);return{secret:e,address:rippleKeypairs.deriveAddress(t.publicKey)}}async queryBook(e,t){return new Promise(async(r,i)=>{try{let s=e.code,n=t.code;n!=CoinType.XAG||t.issuer||(n=CoinType.XRP),s!=CoinType.XAG||e.issuer||(s=CoinType.XRP);const a={base:{currency:s},counter:{currency:n}};let c="";e.issuer&&(c=e.issuer,a.base.counterparty=e.issuer),t.issuer&&(c||(c=t.issuer),a.counter.counterparty=t.issuer),await this.server.getOrderbook(c,a,{limit:150}).then(e=>{let t={asks:[],bids:[]};e.asks.map(e=>{let r=e.specification.quantity.value,i=Number(new Big(e.specification.totalPrice.value).div(e.specification.quantity.value).toFixed(7).toString()).toString();if(e.state&&(r=e.state.fundedAmount.value),Number(r)===Number(0))return;let s={amount:r,price:i},n=t.asks.pop();n?n.price===s.price?(n.amount=Number(new Big(n.amount).add(s.amount).toFixed(7).toString()).toString(),t.asks.push(n)):(t.asks.push(n),t.asks.push(s)):t.asks.push(s)}),e.bids.map(e=>{let r=e.specification.quantity.value,i=Number(new Big(e.specification.totalPrice.value).div(e.specification.quantity.value).toFixed(7).toString()).toString();if(e.state&&(r=e.state.priceOfFundedAmount.value),Number(r)===Number(0))return;let s={amount:r,price:i},n=t.bids.pop();n?n.price===s.price?(n.amount=Number(new Big(n.amount).add(s.amount).toFixed(7).toString()).toString(),t.bids.push(n)):(t.bids.push(n),t.bids.push(s)):t.bids.push(s)}),r(t)}).catch(e=>{i(e)})}catch(e){i(e)}})}async queryOffers(e,t={}){return new Promise(async(r,i)=>{try{let s={};t.limit?s.limit=t.limit:s.limit=200,r(await this.server.getOrders(e,s))}catch(e){i(e)}})}async sendOffer(e,t,r,i,s,n,a){return new Promise(async(c,o)=>{try{let u=Number(new Big(r).times(i).toString()).toFixed(8).toString();e.code==CoinType.XAG&&""===e.issuer&&(e.code=CoinType.XRP),t.code==CoinType.XAG&&""===t.issuer&&(t.code=CoinType.XRP);const l={direction:a,quantity:{currency:t.code,value:r},totalPrice:{currency:e.code,value:u},passive:!1,fillOrKill:!1};e.issuer&&(l.totalPrice.counterparty=e.issuer),t.issuer&&(l.quantity.counterparty=t.issuer);let p=await this.server.prepareOrder(s,l);const{signedTransaction:d}=this.server.sign(p.txJSON,n);this.server.submit(d).then(e=>{e&&"tesSUCCESS"===e.resultCode?c(e):o(e.resultMessage)}).catch(e=>{o(e)})}catch(e){o(e)}})}async cancelOffer(e,t,r){return new Promise(async(i,s)=>{try{const n={orderSequence:e.id};let a=await this.server.prepareOrderCancellation(t,n);const{signedTransaction:c}=this.server.sign(a.txJSON,r);this.server.submit(c).then(e=>{e&&"tesSUCCESS"===e.resultCode?i(e):s(e.resultMessage)}).catch(e=>{s(e)})}catch(e){s(e)}})}isSameAsset(e,t,r){return e.quantity.currency==t.code&&e.quantity.counterparty==t.issuer&&e.totalPrice.currency==r.code&&e.totalPrice.counterparty==r.issuer||(e.quantity.currency==r.code&&e.quantity.counterparty==r.issuer&&e.totalPrice.currency==t.code&&(e.totalPrice.counterparty,t.issuer),!0)}queryLastBook(e,t,r={}){return new Promise(async(i,s)=>{try{r.limit=50;var n=0,a=[];let o=await this.server.getTransactions(r.forAccount,{types:["order","payment"],excludeFailures:!0,limit:r.limit,earliestFirst:!1});for(let i of o){let s=i.outcome.orderbookChanges;if(0!==Object.keys(s).length)for(let c of Object.keys(s)){let o=s[c];if(o)for(let s of o)"partially-filled"!==s.status&&"filled"!==s.status||(null==i.specification.quantity.counterparty&&(i.specification.quantity.currency="XAG",i.specification.quantity.counterparty=""),null==i.specification.totalPrice.counterparty&&(i.specification.totalPrice.currency="XAG",i.specification.totalPrice.counterparty=""),null==s.quantity.counterparty&&(s.quantity.currency="XAG",s.quantity.counterparty=""),null==s.totalPrice.counterparty&&(s.totalPrice.currency="XAG",s.totalPrice.counterparty=""),this.isSameAsset(s,e,t)&&(++n,a.push({base_currency:"buy"===s.direction?s.totalPrice.currency:s.quantity.currency,base_amount:"buy"===s.direction?s.totalPrice.value:s.quantity.value,base_issuer:"buy"===s.direction?s.totalPrice.counterparty:s.quantity.counterparty,counter_currency:"sell"===s.direction?s.totalPrice.currency:s.quantity.currency,counter_amount:"sell"===s.direction?s.totalPrice.value:s.quantity.value,counter_issuer:"sell"===s.direction?s.totalPrice.counterparty:s.quantity.counterparty,buyer:(s.direction,i.address),seller:"sell"===s.direction?i.address:c,node_index:"",rate:"",tx_index:"",executed_time:i.outcome.timestamp,ledger_index:"",offer_sequence:"",provider:"",taker:r.forAccount,tx_hash:i.id,tx_type:"OfferCreate"})))}}var c={result:"success",count:n,exchanges:a};console.log(c),i(c)}catch(e){console.log(e),s({data:[],result:"failed"})}})}async queryLastBook_bak(e,t,r={}){return new Promise((i,s)=>{try{let n={limit:1,descending:!0};r.descending=n.descending,r.limit&&(n.limit=r.limit);let a=e.code,c=t.code;a===CoinType.XAG&&""===e.issuer&&CoinType.XRP,c===CoinType.XAG&&""===t.issuer&&CoinType.XRP;let o=`https://data.ripple.com/v2/exchanges/${e.code}+${e.issuer}/${t.code}+${t.issuer}?limit=${r.limit}&descending=${r.descending}`;r.forAccount&&(o=`https://data.ripple.com/v2/accounts/${r.forAccount}/exchanges?descending=true&limit=200`);let u=new XMLHttpRequest;u.onreadystatechange=(()=>{4===u.readyState&&200===u.status?i(JSON.parse(u.responseText)):400===u.status&&i({data:[]})}),u.open("GET",o),u.send()}catch(e){s(e)}})}async setAccountInfo(e,t,r){try{this.server.isConnected()||await this.server.connect();let i=await this.server.prepareSettings(e,r),s=this.server.sign(i.txJSON,t);return await this.server.submit(s.signedTransaction)}catch(e){console.log(e)}}queryAccountInfo(e){return new Promise(async(t,r)=>{try{t(await this.server.getSettings(e))}catch(e){r(e)}})}}export default RipplexagWallet;
