import StellarSdk from"stellar-sdk";import{AccountType,CoinType}from"../constants";import tradingPlatformConfig from"../config/trading-platform";const round=function(e,t){return e=t?Math.round(e*Math.pow(10,t))/Math.pow(10,t):Math.round(e)},_seq={snapshot:"",time:new Date};class StellarWallet{constructor(e,t={}){e&&this.setServer(e),this.option=t}setServer(e,t){this.url=e,this.server=new StellarSdk.Server(e),"https://horizon.stellar.org"===e?StellarSdk.Network.usePublicNetwork():"https://horizon-testnet.stellar.org"===e?StellarSdk.Network.useTestNetwork():StellarSdk.Network.use(new StellarSdk.Network(t))}destroy(){}getInstance(){return this.server}async isActivated(e){try{return await this.server.accounts().accountId(e).call(),!0}catch(e){if(404===e.response.status&&"Resource Missing"===e.response.title)return!1}}async getBalances(e){try{let t,s=await this.server.loadAccount(e),r=[];return s.balances.forEach(e=>{"native"===e.asset_type?t={code:CoinType.XLM,value:e.balance}:r.push({code:e.asset_code,value:e.balance,issuer:e.asset_issuer})}),t.frozenNative=.5*s.subentry_count+1,r.unshift(t),r}catch(e){return[{value:"0",code:CoinType.XLM}]}}async isTrustAsset(e,t,s){if(CoinType.XLM===t&&!s)return!0;if(e&&s&&e===s)return!0;let r=await this.getBalances(e);return!(!r&&0===r.length)&&r.some(e=>e.issuer===s&&e.code===t)}async getTransactions(e,t={}){return new Promise(async(s,r)=>{try{let a=this.server.payments().forAccount(e).order(t.order||"desc");t.limit&&(a=a.limit(t.limit)),t.cursor&&(a=a.cursor(t.cursor)),s((await a.call()).records)}catch(e){r(e)}})}async getTransaction(e){let t=await this.server.operations().forTransaction(e).call();return t&&t.records&&t.records.length>0?await t.records[0].transaction():null}async sendTransaction(e,t,s,r={}){const a=StellarSdk.Keypair.fromSecret(e),n=a.publicKey(),i=await this.isActivated(t);s=round(s,7);const o=await this.server.loadAccount(n);let c,l;c=r.assetCode&&r.assetIssuer?new StellarSdk.Asset(r.assetCode,r.assetIssuer):StellarSdk.Asset.native(),l=i?StellarSdk.Operation.payment({destination:t,asset:c,amount:s.toString()}):StellarSdk.Operation.createAccount({destination:t,startingBalance:s.toString()});let d=new StellarSdk.TransactionBuilder(o);if(d.addOperation(l),r.memo){const e=new StellarSdk.Memo(r.memoType,r.memo);d.addMemo(e)}let u=d.build();return u.sign(a),this.server.submitTransaction(u)}async changeTrust(e,t,s,r){const a=StellarSdk.Keypair.fromSecret(e),n=a.publicKey(),i=new StellarSdk.Asset(t,s);console.debug("Turst asset",i,r);const o=await this.server.loadAccount(n),c=StellarSdk.Operation.changeTrust({asset:i,limit:r||"0"});let l=new StellarSdk.TransactionBuilder(o).addOperation(c).build();return l.sign(a),this.server.submitTransaction(l)}isValidAddress(e){return StellarSdk.StrKey.isValidEd25519PublicKey(e)}isValidMemo(e,t){try{return new StellarSdk.Memo(e,t),""}catch(e){return e.message}}isTradingPlatformAddress(e){return tradingPlatformConfig[AccountType.stellar][e]}getAccount(e){const t=StellarSdk.Keypair.fromRawEd25519Seed(e),s=t.publicKey();return{secret:t.secret(),address:s}}getAccountFromSecret(e){return{secret:e,address:StellarSdk.Keypair.fromSecret(e).publicKey()}}getAsset(e,t){let s;return"object"==typeof e&&(t=e.issuer,e=e.code),s=e&&t?new StellarSdk.Asset(e,t):StellarSdk.Asset.native()}compareAsset(e,t){if(e.issuer||t.issuer){if(e.issuer===t.issuer&&e.code===t.code)return!0}else if(e.code===t.code)return!0;return!1}async getExchangePath(e,t,s,r,a){return new Promise(async(n,i)=>{try{await this.server.paths(e,t,this.getAsset(s,r),a).call().then(e=>{n(e)}).catch(e=>{console.info(e),i(this.getErrMsg(e))})}catch(e){i(this.getErrMsg(e))}})}async pathPayment(e,t,s){return new Promise(async(r,a)=>{try{const n=e.origin.path.map(e=>"native"==e.asset_type?new StellarSdk.Asset.native:new StellarSdk.Asset(e.asset_code,e.asset_issuer));let i=1.0001,o=e.origin.source_amount;o=round(i*o,7).toString(),this.server.loadAccount(t).then(r=>{const a=StellarSdk.Operation.pathPayment({destination:t,sendAsset:this.getAsset(e.srcCode,e.srcIssuer),sendMax:o,destAsset:this.getAsset(e.dstCode,e.dstIssuer),destAmount:e.origin.destination_amount,path:n}),i=new StellarSdk.TransactionBuilder(r).addOperation(a).build();let c=StellarSdk.Keypair.fromSecret(s);return i.sign(c),i}).then(e=>this.server.submitTransaction(e)).then(e=>{r(e.hash)}).catch(e=>{a(this.getErrMsg(e))})}catch(e){a(this.getErrMsg(e))}})}async queryBook(e,t){return console.debug("orderbook",`${e.code}/${t.code}`),new Promise(async(s,r)=>{try{await this.server.orderbook(this.getAsset(e),this.getAsset(t)).call().then(e=>{s(e)}).catch(s=>{console.error(s,`${e.code}/${t.code}`),r(this.getErrMsg(s))})}catch(e){r(this.getErrMsg(e))}})}async queryLastBook(e,t,s={}){return new Promise(async(r,a)=>{if(s.forAccount)try{let n=this.server.trades().forAssetPair(this.getAsset(e),this.getAsset(t)).forAccount(s.forAccount).order(s.order||"desc");s.limit&&(n=n.limit(s.limit)),s.cursor&&(n=n.cursor(s.cursor));let i=await n.call(),o=[];i.records&&i.records.forEach(s=>{let r=this.getAsset(s.base_asset_code,s.base_asset_issuer),a=this.getAsset(s.counter_asset_code,s.counter_asset_issuer);this.compareAsset(r,this.getAsset(e))&&this.compareAsset(a,this.getAsset(t))?o.push(s):this.compareAsset(a,this.getAsset(e))&&this.compareAsset(r,this.getAsset(t))&&o.push(s)}),r(o)}catch(e){a(e)}else try{let n=this.server.trades().forAssetPair(this.getAsset(e),this.getAsset(t)).order(s.order||"desc");s.limit&&(n=n.limit(s.limit)),s.cursor&&(n=n.cursor(s.cursor)),r((await n.call()).records)}catch(e){a(e)}})}async sendOffer(e,t,s,r,a,n){return new Promise(async(i,o)=>{try{this.server.loadAccount(a).then(a=>{const i=StellarSdk.Operation.manageOffer({selling:this.getAsset(e.code,e.issuer),buying:this.getAsset(t.code,t.issuer),amount:round(s,7).toString(),price:r.toString()}),o=new StellarSdk.TransactionBuilder(a).addOperation(i).build();let c=StellarSdk.Keypair.fromSecret(n);return o.sign(c),o}).then(e=>this.server.submitTransaction(e)).then(e=>{i(e.hash)}).catch(e=>{o(this.getErrMsg(e))})}catch(e){o(this.getErrMsg(e))}})}async queryOffers(e,t={}){return console.debug("offers",e),new Promise(async(s,r)=>{try{let a=this.server.offers("accounts",e);a=t.limit?a.limit(t.limit):a.limit(200),s((await a.call()).records)}catch(e){r(e)}})}_updateSeq(e){const t=new Date;if(t-_seq.time<5e3)for(;e.sequence<=_seq.snapshot;)e.incrementSequenceNumber(),console.debug("Sequence: "+_seq.snapshot+" -> "+e.sequence);_seq.snapshot=e.sequence,_seq.time=t}async cancelOffer(e,t,s){return new Promise(async(r,a)=>{try{this.server.loadAccount(t).then(t=>{this._updateSeq(t);const r=StellarSdk.Operation.manageOffer({selling:this.getAsset(e.selling.code,e.selling.issuer),buying:this.getAsset(e.buying.code,e.buying.issuer),amount:"0",price:e.price.toString(),offerId:e.id}),a=new StellarSdk.TransactionBuilder(t).addOperation(r).build();let n=StellarSdk.Keypair.fromSecret(s);return a.sign(n),a}).then(e=>this.server.submitTransaction(e)).then(e=>{r(e.hash)}).catch(e=>{a(this.getErrMsg(e))})}catch(e){a(this.getErrMsg(e))}})}async queryOfferHistorys(e,t={}){return new Promise(async(s,r)=>{try{let a=await this.server.transactions().forAccount(e).order(t.order||"desc");a=t.limit?a.limit(t.limit):a.limit(20);let n=await a.call(),i=[];for(const e of n.records){let t=new StellarSdk.Transaction(e.envelope_xdr);i.push(t.operations[0])}s(i)}catch(e){r(e)}})}getErrMsg(e){let t="";if(e instanceof StellarSdk.NotFoundError)t="NotFoundError";else if(e.response&&e.response.extras&&e.response.extras.reason)t=e.response.extras.reason;else if(e.response&&e.response.data&&e.response.data.extras&&e.response.data.extras.result_xdr){const s=StellarSdk.xdr.TransactionResult.fromXDR(e.response.data.extras.result_xdr,"base64");t=s.result().results()?s.result().results()[0].value().value().switch().name:s.result().switch().name}else t=e.detail||e.message;return t||console.error("Fail in getErrMsg",e),t}}export default StellarWallet;
