/** Deterministic synthetic OHLCV, never market history. Indicators use these bars only. */
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round=x=>Math.round(x*100)/100;
/* Realistic synthetic OHLCV helpers (2026-10-31). Constructed data only, never market history.
 * Calibrated against Binance 1h BTC/ETH/SOL bars (see data/kline-realism-2026-10-31.md):
 * - open = previous close (24/7 market, no gaps)
 * - high/low come from a simulated intrabar price path (Brownian bridge from open to close),
 *   so body/wick proportions, dojis and no-wick bars occur at realistic rates
 * - volatility clusters (GARCH-style) with occasional larger shocks
 * - volume tracks bar range and is persistent from bar to bar */
export const lcg=seed=>{let n=seed>>>0;return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};};
export const gauss=r=>{let u=0,v=0;while(!u)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
/** High and low of a Brownian bridge from open to close with per-bar volatility sigma (price units). */
export function intrabar(open,close,sigma,r,steps=30){
 const s=sigma/Math.sqrt(steps);let w=0,hi=Math.max(open,close),lo=Math.min(open,close);const path=[0];
 for(let k=1;k<=steps;k++){w+=s*gauss(r);path.push(w);}
 for(let k=1;k<steps;k++){const p=open+path[k]-path[steps]*k/steps+(close-open)*k/steps;if(p>hi)hi=p;if(p<lo)lo=p;}
 // tick-level overshoot beyond the sampled path (microstructure); keeps some exact no-wick bars
 const ov=()=>r()<.22?0:Math.abs(gauss(r))*s*.9;
 return {high:round(hi+ov()),low:round(lo-ov())};
}
/** Volume that rises with range relative to typical range, with bar-to-bar persistence. */
export function volumeModel(r,{base=14000,typical=.6}={}){let e=0;return range=>{e=.8*e+.3*gauss(r);return Math.round(base*Math.pow(Math.max(range,.02)/typical,1.25)*Math.exp(e));};}
/** GARCH(1,1)-style volatility state: call next(lastMove) once per bar. */
export function volState(sigma0,{alpha=.17,beta=.8}={}){let v=sigma0*sigma0;const w=v*(1-alpha-beta);return {get sigma(){return Math.sqrt(v);},next(move){v=Math.min(9*w/(1-alpha-beta),Math.max(.25*w/(1-alpha-beta),w+alpha*move*move+beta*v));return Math.sqrt(v);}};}
/** Fat-tailed shock: mostly normal, occasionally a larger move. */
export const shock=r=>gauss(r)*(r()<.05?3.2:1)/1.21;
export function sampleBars(count=120,seed=721){const r=lcg(seed),vs=volState(.5),vol=volumeModel(r,{typical:.62});let close=100;return Array.from({length:count},(_,i)=>{const open=close,phase=i%40,drift=phase<15?.09:phase<27?-.085:0,sigma=vs.sigma,move=drift+sigma*shock(r);close=round(Math.max(10,open+move));const {high,low}=intrabar(open,close,sigma*1.12,r);vs.next(close-open-drift);return {time:new Date(Date.UTC(2026,0,1,i)).toISOString(),open,high,low,close,volume:vol(high-low)};});}
export function sma(values,n){return values.map((_,i)=>i<n-1?null:values.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/n);}
export function ema(values,n){let v=null,sum=0;return values.map((x,i)=>{if(x==null)return null;if(v===null){sum+=x;if(i<n-1)return null;v=sum/n;}else v+=(x-v)*2/(n+1);return v;});}
export function indicators(bars){const c=bars.map(b=>b.close),ma=sma(c,20),fast=ema(c,12),slow=ema(c,26),macd=c.map((_,i)=>slow[i]==null?null:fast[i]-slow[i]);const offset=macd.findIndex(x=>x!==null),sig=ema(macd.slice(offset),9),signal=c.map((_,i)=>i<offset?null:sig[i-offset]);let gain=0,loss=0,tr=0,pv=0,vol=0,lastDay='';const rsi=[],atr=[],vwap=[];bars.forEach((b,i)=>{const d=i?b.close-c[i-1]:0,t=i?Math.max(b.high-b.low,Math.abs(b.high-c[i-1]),Math.abs(b.low-c[i-1])):b.high-b.low;if(i>0&&i<=14){gain+=Math.max(d,0)/14;loss+=Math.max(-d,0)/14;}else if(i>14){gain=(gain*13+Math.max(d,0))/14;loss=(loss*13+Math.max(-d,0))/14;}rsi.push(i<14?null:loss===0?(gain===0?50:100):100-100/(1+gain/loss));if(i<14)tr+=t/14;else tr=(tr*13+t)/14;atr.push(i<13?null:tr);const day=b.time.slice(0,10);if(day!==lastDay){pv=0;vol=0;lastDay=day;}pv+=(b.high+b.low+b.close)/3*b.volume;vol+=b.volume;vwap.push(pv/vol);});const std=c.map((_,i)=>ma[i]==null?null:Math.sqrt(c.slice(i-19,i+1).reduce((s,x)=>s+(x-ma[i])**2,0)/20));return {sma:ma,ema:ema(c,20),fast:sma(c,9),slow:sma(c,21),upper:ma.map((v,i)=>v==null?null:v+2*std[i]),lower:ma.map((v,i)=>v==null?null:v-2*std[i]),rsi,atr,macd,signal,histogram:macd.map((v,i)=>signal[i]==null?null:v-signal[i]),vwap};}
const palette={up:'#247566',down:'#b34840',ink:'#242821',muted:'#64655e',grid:'#dedfd7',paper:'#faf9f5',line:'#4c5985'};
export function renderChart(bars,{id=113,en=false,start=0,limit=48,separator=null,hidden=false}={}){
 const I=indicators(bars),rows=bars.slice(start,start+limit),n=rows.length;if(!n)return '';const t=(a,b)=>en?b:a,x=i=>52+(i+.5)*608/Math.max(limit,n),X=extraChartIds.includes(id)?extended(bars):null,osc=[11,12,27].includes(id)||PANEL_IDS.includes(id),H=osc?570:440,priceTop=58,priceBottom=osc?266:286,volTop=priceBottom+26,volBottom=volTop+64;
 const overlays=id===1?[['SMA 20',I.sma,'',palette.ink]]:id===2?[['EMA 20',I.ema,'',palette.ink]]:id===9?[['SMA 9',I.fast,'',palette.ink],['SMA 21',I.slow,'6 4',palette.line]]:id===21?[[t('上轨 BB20·2σ','Upper BB20·2σ'),I.upper,'5 3',palette.line],[t('中轨 SMA20','Middle SMA20'),I.sma,'',palette.ink],[t('下轨','Lower'),I.lower,'5 3',palette.line]]:id===37?[['VWAP · HLC3 · UTC',I.vwap,'',palette.line]]:X?extraOverlays(id,X,t):[];
 let vals=rows.flatMap(b=>[b.low,b.high]);for(const [,a]of overlays)vals.push(...a.slice(start,start+n).filter(v=>v!=null));let lo=Math.min(...vals),hi=Math.max(...vals),pad=Math.max((hi-lo)*.12,.5);lo-=pad;hi+=pad;const py=v=>priceBottom-(v-lo)/(hi-lo)*(priceBottom-priceTop),vmax=Math.max(...rows.map(b=>b.volume))*1.12;
 const text=(x,y,s,extra='')=>`<text x="${x}" y="${y}" fill="${palette.muted}" font-size="12" ${extra}>${esc(s)}</text>`;
 let svg=`<svg class="market-chart-svg" viewBox="0 0 760 ${H}" role="img" aria-label="${t('模拟小时K线、成交量与对应指标；非真实行情','Synthetic hourly candles, volume and matching indicator; not market history')}"><desc>${t('每根K线表示一小时，实体显示开盘收盘，影线显示最高最低；成交量位于下方，各指标使用同一组价格计算。','Each candle spans one hour: body shows open and close, wick high and low, and volume appears below. Indicators use the same price data.')}</desc><rect width="760" height="${H}" fill="${palette.paper}"/>${text(18,24,t('模拟资产 / 1小时 / 美元 / UTC','SIM / 1 hour / USD / UTC'))}${text(18,44,t('绿空心：收≥开　红实心：收<开；实体=开收，影线=高低','Green hollow: C≥O · red filled: C<O · body O/C · wick H/L'))}`;
 for(let k=0;k<5;k++){const v=lo+(hi-lo)*k/4,y=py(v);svg+=`<path d="M44 ${y}H668" stroke="${palette.grid}" stroke-width=".7"/>`+text(680,y+4,v.toFixed(2));}
 for(let i=0;i<n;i+=8){svg+=`<path d="M${x(i)} ${priceTop}V${volBottom}" stroke="${palette.grid}" stroke-width=".6"/>`;const date=rows[i].time;svg+=text(x(i),H-14,`${date.slice(8,10)} ${date.slice(11,16)}`,'text-anchor="middle"');}
 rows.forEach((b,i)=>{const color=b.close>=b.open?palette.up:palette.down,w=Math.min(14,608/Math.max(limit,n)*.78),y=Math.min(py(b.open),py(b.close)),h=Math.max(1,Math.abs(py(b.close)-py(b.open)));svg+=`<g class="ohlc-candle" data-bar="${start+i}"><title>${esc(b.time+' · O '+b.open.toFixed(2)+' H '+b.high.toFixed(2)+' L '+b.low.toFixed(2)+' C '+b.close.toFixed(2)+' · V '+b.volume)}</title><path d="M${x(i)} ${py(b.high)}V${py(b.low)}" stroke="${color}" stroke-width="1.2"/><rect x="${x(i)-w/2}" y="${y}" width="${w}" height="${h}" fill="${b.close>=b.open?palette.paper:color}" stroke="${color}" stroke-width="1.1"/><rect x="${x(i)-w/2}" y="${volBottom-b.volume/vmax*(volBottom-volTop)}" width="${w}" height="${b.volume/vmax*(volBottom-volTop)}" fill="${color}" opacity=".65"/></g>`;});
 const plot=(a,y,color,dash='')=>{let d='',active=false;a.slice(start,start+n).forEach((v,i)=>{if(v==null){active=false;return;}d+=`${active?'L':'M'}${x(i).toFixed(2)} ${y(v).toFixed(2)} `;active=true;});return `<path d="${d}" stroke="${color}" stroke-width="1.8" fill="none" ${dash?`stroke-dasharray="${dash}"`:''}/>`;};
 overlays.forEach(([,a,dash,color,kind])=>svg+=kind==='dots'?a.slice(start,start+n).map((v,i)=>v==null?'':`<circle cx="${x(i).toFixed(2)}" cy="${py(v).toFixed(2)}" r="2.3" fill="${color}"/>`).join(''):plot(a,py,color,dash));svg+=text(18,volTop+14,t('成交量 · 股','Volume · shares'))+text(680,volTop+14,`${(vmax/1000).toFixed(1)}k`)+text(680,volBottom,'0');
 let legend=overlays.filter(o=>o[0]&&o[1][start+n-1]!=null).map(([name,a])=>`${name} ${a[start+n-1]?.toFixed(2)??'—'}`).join(' / ');
 if(osc&&PANEL_IDS.includes(id)){const r=extraPanelSvg(id,X,t,start,n,plot,text);svg+=r.svg;legend=r.legend;}
 else if(osc){const a=id===11?I.rsi:id===27?I.atr:I.macd,series=id===12?[a,I.signal,I.histogram]:[a],ov=series.flatMap(a=>a.slice(start,start+n).filter(v=>v!==null));let min=id===11?0:id===27?0:Math.min(0,...ov),max=id===11?100:Math.max(...ov)*1.2;max=Math.max(max,min+.01);const top=400,bottom=526,y=v=>bottom-(v-min)/(max-min)*(bottom-top);for(let k=0;k<3;k++){let v=min+(max-min)*k/2;svg+=`<path d="M44 ${y(v)}H668" stroke="${palette.grid}"/>`+text(680,y(v)+4,v.toFixed(id===11?0:2));}
 if(id===11)for(const v of[30,70])svg+=`<path d="M44 ${y(v)}H668" stroke="${palette.muted}" stroke-dasharray="4 4"/>`+text(680,y(v)+4,v);
 if(id===12){svg+=`<path d="M44 ${y(0)}H668" stroke="${palette.muted}"/>`;I.histogram.slice(start,start+n).forEach((v,i)=>{const w=Math.min(14,608/Math.max(limit,n)*.78);if(v!=null)svg+=`<rect x="${x(i)-w/2}" y="${Math.min(y(0),y(v))}" width="${w}" height="${Math.max(.7,Math.abs(y(v)-y(0)))}" fill="${v>=0?palette.up:palette.down}"/>`;});svg+=plot(I.signal,y,palette.line,'5 3');}
 svg+=plot(a,y,palette.ink);const name=id===11?'RSI 14 · Wilder':id===27?'ATR 14 · Wilder':'MACD 12/26/9';svg+=text(18,389,name);legend=`${name}: ${a[start+n-1]?.toFixed(2)}${id===12?` / Signal ${I.signal[start+n-1]?.toFixed(2)} / Hist ${I.histogram[start+n-1]?.toFixed(2)}`:''}`;
 }
 if(separator!=null){const sx=x(separator)-608/Math.max(limit,n)/2;svg+=`<path d="M${sx} 55V${volBottom}" stroke="${palette.ink}" stroke-dasharray="5 4"/>`+text(sx+8,priceTop+18,hidden?t('后续隐藏','Future hidden'):t('揭晓后续','Revealed'));}
 svg+='</svg>';return `<div class="market-chart-scroll" tabindex="0" role="region" aria-label="${t('横向滚动查看完整模拟K线','Scroll horizontally to read the full synthetic chart')}">${svg}</div>${legend?`<p class="market-chart-legend">${esc(legend)} · ${t('末根已收盘读数','Final completed bar')}</p>`:''}`;
}
export function candleLesson(id,en=false){const bars=sampleBars(),start=72,I=indicators(bars),X=extraChartIds.includes(id)?extended(bars):null,last=bars.at(-1),n=bars.length-1,t=(a,b)=>en?b:a;const names={1:'SMA 20',2:'EMA 20',9:'SMA 9 / 21',11:'RSI 14',12:'MACD 12/26/9',21:'BB 20 / 2',27:'ATR 14',32:'Volume',37:'VWAP',113:t('K线基础','Candlestick basics')};let reading={1:t('对比K线收盘与黑色20期均线，不用影线触碰代替收盘穿越。','Compare candle closes with the black 20-bar average; a wick touching it is not a closing cross.'),2:t('黑线是20期EMA；更重视近期价格，但仍会滞后。','The black 20-bar EMA weights recent prices more, while still lagging.'),9:t('黑色实线是9期SMA，蓝灰虚线是21期SMA。先比较前后两根，再认交叉方向。','Black solid: SMA 9; blue-gray dashed: SMA 21. Compare adjacent bars to identify a genuine cross.'),11:t('上方先看价格，下方再看RSI；右轴0—100不是涨跌百分比，30/70虚线不是买卖按钮。','Read price above and RSI below. Its 0–100 scale is not return percent; 30/70 are not trade buttons.'),12:t('副图黑实线MACD、蓝灰虚线信号线、柱为两线之差。柱转正不等于MACD本身转正。','Below: black MACD, blue-gray dashed signal, histogram is their difference. A positive histogram does not mean MACD itself is positive.'),21:t('轨道由同一批收盘价滚动计算，会随波动扩张或收缩；不是固定的平行横线。','Bands roll with these same closes and expand or contract with volatility, rather than remaining fixed horizontal lines.'),27:t('下方ATR用美元表示历史波幅；价格跌时它也能升高。','The lower ATR panel measures historical range in USD; it can rise while price falls.'),32:t('每根量柱对应正上方同一小时的K线；颜色沿用该根开收关系，不代表净买量或净卖量。','Each volume bar matches the candle above. Color follows that candle’s open/close relation, not net buying or selling.'),37:t('VWAP按每根HLC3和量累计，每个UTC日从头开始；本例采用UTC，不代表所有市场都这样重置。','VWAP accumulates HLC3 × volume and resets each UTC day here; real sessions depend on the market.'),113:t('实体两端是开盘与收盘，细线两端是最高与最低。绿空心表示收盘不低于开盘，红实心表示收盘低于开盘；其他平台配色可相反。','Body edges show open and close; wick ends show high and low. Green hollow means close ≥ open, red filled means close < open; platforms may use other colors.')}[id]??(EXTRA_READING[id]?t(...EXTRA_READING[id]):'');const f=v=>v.toFixed(2);return `<figure id="chart-${id}" class="figure-box real-candle-figure" data-candle-topic="${id}" data-figure-topic="${id}"><figcaption><h3>${esc(names[id]??EXTRA_NAMES[id])} — ${t('对照交易图读一遍','Read it in chart context')}</h3><p class="figure-caption">${t('模拟资产，非真实历史或预测。每根为1小时已收盘K线；展示48根，指标另用前72根预热。图较宽时左右滑动，或展开数值表。','Synthetic asset, not history or a forecast. Each candle is a completed hour. Shows 48 bars with 72 earlier bars for indicator warm-up. Scroll wide charts horizontally or open the data table.')}</p></figcaption>${renderChart(bars,{id,en,start})}<p class="figure-read">${reading}</p><p>${t(`最后一根：开 ${f(last.open)}，高 ${f(last.high)}，低 ${f(last.low)}，收 ${f(last.close)}；成交 ${last.volume.toLocaleString('en-US')} 股。先在图最右边找到它，再与表格核对。`,`Final bar: O ${f(last.open)}, H ${f(last.high)}, L ${f(last.low)}, C ${f(last.close)}; ${last.volume.toLocaleString('en-US')} shares. Find it at the right edge and check the table.`)}</p><details class="candle-data"><summary>${t('查看这48根K线的原始数值','Inspect all 48 underlying OHLCV bars')}</summary><div class="market-chart-scroll" tabindex="0"><table><caption>${t('与上图一一对应的模拟数据；时间为UTC','Synthetic data matching the chart; UTC timestamps')}</caption><thead><tr>${[t('时间','Time'),'O','H','L','C',t('成交量','Volume')].map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${bars.slice(start).map(b=>`<tr><th scope="row">${b.time.slice(5,16).replace('T',' ')}</th>${['open','high','low','close'].map(k=>`<td>${f(b[k])}</td>`).join('')}<td>${b.volume}</td></tr>`).join('')}</tbody></table></div></details><details><summary>${t('停一下：先自己读图，再看答案','Pause: read the chart before opening the answer')}</summary><p>${t(`最后一根收盘${last.close>=last.open?'不低于':'低于'}开盘，所以是${last.close>=last.open?'绿空心':'红实心'}；实体高度是 ${f(Math.abs(last.close-last.open))} 美元，整根高低范围是 ${f(last.high-last.low)} 美元。${id===11?`同一根RSI是 ${f(I.rsi[n])}，这不是上涨概率。`:id===27?`同一根ATR是 ${f(I.atr[n])}，不等于下一根必须走这么远。`:X?`同一根读数：${esc(extraReadout(id,X,n,t))}；这是对已收盘数据的描述，不是对下一根的预测。`:''}`,`The final close is ${last.close>=last.open?'at or above':'below'} its open, so the body is ${last.close>=last.open?'green hollow':'red filled'}. Body height is $${f(Math.abs(last.close-last.open))}; high-low range is $${f(last.high-last.low)}.${id===11?` RSI is ${f(I.rsi[n])}, not a probability of rising.`:id===27?` ATR is ${f(I.atr[n])}, not a promised next-bar range.`:X?` Readings on that bar: ${esc(extraReadout(id,X,n,t))}. This describes completed data, not a forecast of the next bar.`:''}`)}</p></details><p class="figure-footnote">${t('形状像真实交易图，数据仍是教学模拟；不据此推断真实市场胜率。后面的小数字算例独立演算，不是上图的逐点数据。','Realistic chart conventions, synthetic teaching data. This is not evidence of a trading edge. Any small-number worked example below is separate from the plotted series.')}</p><p class="figure-footnote"><a href="https://www.tradingview.com/support/solutions/43000745269-introduction-to-candlestick-charts-and-patterns/" target="_blank" rel="noopener noreferrer">${t('K线画法参考：TradingView 官方说明','Candlestick conventions: TradingView documentation')}</a></p></figure>`;}
export function caseBars(c,revealed){
 const anchors=c.before,step=c.id==='case-breakout'?1:3;let bars=[],prev=anchors[0]-.35;
 const r=lcg([...c.id].reduce((a,ch)=>a*31+ch.charCodeAt(0),7)),vol=volumeModel(r,{base:12000,typical:.55});function append(target,k){const open=round(prev),close=round(target),m=bars.length,sig=Math.max(.32,Math.abs(close-open)*1.15),{high,low}=intrabar(open,close,sig,r);bars.push({time:new Date(Date.UTC(2026,0,1,m)).toISOString(),open,close,high,low,volume:vol(high-low)});prev=close;}
 for(let a=0;a<anchors.length;a++){const from=prev;for(let j=1;j<=step;j++)append(from+(anchors[a]-from)*j/step+(j===step?0:gauss(r)*.38));}
 const split=bars.length;
 if(c.id==='case-breakout'){
  bars.slice(0,-1).forEach((b,i)=>b.high=i===0?99:100);
  Object.assign(bars.at(-1),{open:99,high:102,low:98.8,close:101});
  if(revealed){bars.at(-1).close=c.after[0];bars.at(-1).volume+=4200;prev=c.after[0];c.after.slice(1).forEach(append);}
 }else if(revealed)for(const target of c.after){const from=prev;for(let j=1;j<=step;j++)append(from+(target-from)*j/step+(j===step?0:gauss(r)*.38));}
 return {bars,split,limit:c.id==='case-breakout'?9:30};
}
/** Additional chart topics (2026-10-30): same synthetic bars; common built-in definitions, parameters match each lesson's practice setup. */
const smaN=(a,n)=>a.map((_,i)=>{if(i<n-1)return null;const w=a.slice(i-n+1,i+1);return w.some(x=>x==null)?null:w.reduce((s,x)=>s+x,0)/n;});
export function wilder(vals,n){let v=null;const seed=[];return vals.map(x=>{if(x==null)return null;if(v===null){seed.push(x);if(seed.length<n)return null;v=seed.reduce((a,b)=>a+b,0)/n;}else v=(v*(n-1)+x)/n;return v;});}
export function extended(bars){return {...extendedBase(bars),...more(bars),...more3(bars)};}
function extendedBase(bars){
 const c=bars.map(b=>b.close),h=bars.map(b=>b.high),l=bars.map(b=>b.low),v=bars.map(b=>b.volume),tp=bars.map(b=>(b.high+b.low+b.close)/3),N=bars.length;
 const hh=n=>h.map((_,i)=>i<n-1?null:Math.max(...h.slice(i-n+1,i+1))),ll=n=>l.map((_,i)=>i<n-1?null:Math.min(...l.slice(i-n+1,i+1)));
 const s20=smaN(c,20),sd20=c.map((_,i)=>s20[i]==null?null:Math.sqrt(c.slice(i-19,i+1).reduce((s,x)=>s+(x-s20[i])**2,0)/20));
 const bbU=s20.map((m,i)=>m==null?null:m+2*sd20[i]),bbL=s20.map((m,i)=>m==null?null:m-2*sd20[i]);
 const wma=c.map((_,i)=>i<19?null:c.slice(i-19,i+1).reduce((s,x,k)=>s+x*(k+1),0)/210);
 const vwma=c.map((_,i)=>i<19?null:c.slice(i-19,i+1).reduce((s,x,k)=>s+x*v[i-19+k],0)/v.slice(i-19,i+1).reduce((a,b)=>a+b,0));
 const H14=hh(14),L14=ll(14),raw=c.map((x,i)=>H14[i]==null?null:H14[i]===L14[i]?50:100*(x-L14[i])/(H14[i]-L14[i])),stK=smaN(raw,3),stD=smaN(stK,3);
 const wr=c.map((x,i)=>H14[i]==null?null:H14[i]===L14[i]?-50:-100*(H14[i]-x)/(H14[i]-L14[i]));
 const tp20=smaN(tp,20),cci=tp.map((x,i)=>{if(tp20[i]==null)return null;const md=tp.slice(i-19,i+1).reduce((s,y)=>s+Math.abs(y-tp20[i]),0)/20;return md===0?0:(x-tp20[i])/(0.015*md);});
 const roc=c.map((x,i)=>i<10?null:100*(x-c[i-10])/c[i-10]),mom=c.map((x,i)=>i<10?null:x-c[i-10]);
 const mfi=tp.map((_,i)=>{if(i<14)return null;let up=0,dn=0;for(let k=i-13;k<=i;k++){const d=tp[k]-tp[k-1],f=tp[k]*v[k];if(d>0)up+=f;else if(d<0)dn+=f;}return dn===0?(up===0?50:100):100-100/(1+up/dn);});
 const bbw=s20.map((m,i)=>m==null?null:(bbU[i]-bbL[i])/m*100),pctB=c.map((x,i)=>s20[i]==null?null:bbU[i]===bbL[i]?.5:(x-bbL[i])/(bbU[i]-bbL[i]));
 const H20=hh(20),L20=ll(20),dcM=H20.map((x,i)=>x==null?null:(x+L20[i])/2);
 const tr=bars.map((b,i)=>i?Math.max(b.high-b.low,Math.abs(b.high-c[i-1]),Math.abs(b.low-c[i-1])):b.high-b.low),atr10=wilder(tr,10),kcM=ema(c,20);
 const kcU=kcM.map((m,i)=>m==null||atr10[i]==null?null:m+2*atr10[i]),kcL=kcM.map((m,i)=>m==null||atr10[i]==null?null:m-2*atr10[i]);
 const envU=s20.map(m=>m==null?null:m*1.03),envL=s20.map(m=>m==null?null:m*.97);
 let acc=0;const obv=c.map((x,i)=>{if(i)acc+=x>c[i-1]?v[i]:x<c[i-1]?-v[i]:0;return acc;});
 const sar=Array(N).fill(null),sarUp=Array(N).fill(null),sarFlip=Array(N).fill(false);
 {let up=c[1]>=c[0],af=.02,ep=up?Math.max(h[0],h[1]):Math.min(l[0],l[1]),s=up?Math.min(l[0],l[1]):Math.max(h[0],h[1]),fresh=true;
  for(let i=2;i<N;i++){if(!fresh)s=s+af*(ep-s);fresh=false;s=up?Math.min(s,l[i-1],l[i-2]):Math.max(s,h[i-1],h[i-2]);sar[i]=s;sarUp[i]=up;
   if(up&&l[i]<=s){sarFlip[i]=true;up=false;s=ep;ep=l[i];af=.02;fresh=true;}
   else if(!up&&h[i]>=s){sarFlip[i]=true;up=true;s=ep;ep=h[i];af=.02;fresh=true;}
   else if(up&&h[i]>ep){ep=h[i];af=Math.min(af+.02,.2);}else if(!up&&l[i]<ep){ep=l[i];af=Math.min(af+.02,.2);}}}
 const st=Array(N).fill(null),stDir=Array(N).fill(null),stLo=Array(N).fill(null),stHi=Array(N).fill(null);
 {let pu=null,pd=null,pst=null,dir=1;for(let i=0;i<N;i++){if(atr10[i]==null)continue;const m=(h[i]+l[i])/2;let u=m-3*atr10[i],d=m+3*atr10[i];
  if(pu!=null){if(!(u>pu||c[i-1]<pu))u=pu;if(!(d<pd||c[i-1]>pd))d=pd;dir=pst===pd?(c[i]>d?1:-1):(c[i]<u?-1:1);}
  st[i]=dir===1?u:d;stDir[i]=dir;stLo[i]=u;stHi[i]=d;pu=u;pd=d;pst=st[i];}}
 const pDM=bars.map((_,i)=>{if(!i)return null;const u=h[i]-h[i-1],d=l[i-1]-l[i];return u>d&&u>0?u:0;}),mDM=bars.map((_,i)=>{if(!i)return null;const u=h[i]-h[i-1],d=l[i-1]-l[i];return d>u&&d>0?d:0;});
 const rTR=wilder(tr.map((x,i)=>i?x:null),14),rP=wilder(pDM,14),rM=wilder(mDM,14);
 const pDI=rTR.map((t,i)=>t==null?null:100*rP[i]/t),mDI=rTR.map((t,i)=>t==null?null:100*rM[i]/t),dx=pDI.map((p,i)=>p==null?null:Math.abs(p-mDI[i])/((p+mDI[i])||1)),adx=wilder(dx,14).map(x=>x==null?null:100*x);
 const aroon=(arr,pick)=>arr.map((_,i)=>{if(i<14)return null;const w=arr.slice(i-14,i+1);return 100*w.lastIndexOf(pick(...w))/14;});
 return {wma,vwma,sma20:s20,bbU,bbL,stK,stD,raw,wr,cci,roc,mom,mfi,bbw,pctB,dcU:H20,dcL:L20,dcM,atr10,kcM,kcU,kcL,envU,envL,obv,sar,sarUp,sarFlip,st,stDir,stLo,stHi,pDI,mDI,adx,aroonUp:aroon(h,Math.max),aroonDn:aroon(l,Math.min)};
}
// 2026-10-30 batch 2: more chart topics on the same synthetic bars (common built-in definitions).
const emaN=(a,n)=>{let v=null;const seed=[];return a.map(x=>{if(x==null)return null;if(v===null){seed.push(x);if(seed.length<n)return null;v=seed.reduce((s,y)=>s+y,0)/n;}else v+=(x-v)*2/(n+1);return v;});};
const wmaN=(a,n)=>a.map((_,i)=>{if(i<n-1)return null;const w=a.slice(i-n+1,i+1);return w.some(x=>x==null)?null:w.reduce((s,x,k)=>s+x*(k+1),0)/(n*(n+1)/2);});
const sumN=(a,n)=>a.map((_,i)=>{if(i<n-1)return null;const w=a.slice(i-n+1,i+1);return w.some(x=>x==null)?null:w.reduce((s,x)=>s+x,0);});
const cum=a=>{let s=0;return a.map(x=>s+=x);};
const pair=(a,b,f)=>a.map((x,i)=>x==null||b[i]==null?null:f(x,b[i],i));
function more(bars){
 const c=bars.map(b=>b.close),o=bars.map(b=>b.open),h=bars.map(b=>b.high),l=bars.map(b=>b.low),v=bars.map(b=>b.volume),hl2=bars.map(b=>(b.high+b.low)/2),N=bars.length;
 const tr=bars.map((b,i)=>i?Math.max(b.high-b.low,Math.abs(b.high-c[i-1]),Math.abs(b.low-c[i-1])):b.high-b.low);
 const hh=(a,n)=>a.map((_,i)=>i<n-1?null:Math.max(...a.slice(i-n+1,i+1))),ll=(a,n)=>a.map((_,i)=>i<n-1?null:Math.min(...a.slice(i-n+1,i+1)));
 const smma=wilder(c,20);
 const w10=wmaN(c,10),w20=wmaN(c,20),hma=wmaN(pair(w10,w20,(a,b)=>2*a-b),4);
 const e1=emaN(c,20),e2=emaN(e1,20),e3=emaN(e2,20),dema=pair(e1,e2,(a,b)=>2*a-b),tema=e1.map((x,i)=>x==null||e3[i]==null?null:3*x-3*e2[i]+e3[i]);
 const ribbon=[10,20,30,40,50].map(n=>emaN(c,n));
 const lsma=c.map((_,i)=>{const n=25;if(i<n-1)return null;const w=c.slice(i-n+1,i+1),mx=(n-1)/2,my=w.reduce((s,y)=>s+y,0)/n;let sxy=0,sxx=0;w.forEach((y,k)=>{sxy+=(k-mx)*(y-my);sxx+=(k-mx)**2;});return my+sxy/sxx*(n-1-mx);});
 const atr22=wilder(tr,22),H22=hh(h,22),L22=ll(l,22),ceLong=pair(H22,atr22,(a,b)=>a-3*b),ceShort=pair(L22,atr22,(a,b)=>a+3*b);
 const f12=emaN(c,12),s26=emaN(c,26),ppo=pair(f12,s26,(a,b)=>100*(a-b)/b),ppoSig=emaN(ppo,9),ppoHist=pair(ppo,ppoSig,(a,b)=>a-b);
 const atr14=wilder(tr,14),natr=pair(atr14,c,(a,b)=>100*a/b);
 const sd20=c.map((_,i)=>{if(i<19)return null;const w=c.slice(i-19,i+1),m=w.reduce((s,x)=>s+x,0)/20;return Math.sqrt(w.reduce((s,x)=>s+(x-m)**2,0)/20);});
 const rvol=v.map((x,i)=>i<20?null:x/(v.slice(i-20,i).reduce((s,y)=>s+y,0)/20));
 const pvt=cum(c.map((x,i)=>i?(x-c[i-1])/c[i-1]*v[i]:0));
 const vf=emaN(v,12),vs=emaN(v,26),pvo=pair(vf,vs,(a,b)=>100*(a-b)/b),pvoSig=emaN(pvo,9),pvoHist=pair(pvo,pvoSig,(a,b)=>a-b);
 const vmP=bars.map((b,i)=>i?Math.abs(b.high-l[i-1]):null),vmM=bars.map((b,i)=>i?Math.abs(b.low-h[i-1]):null),tr1=tr.map((x,i)=>i?x:null),sTR=sumN(tr1,14),viP=pair(sumN(vmP,14),sTR,(a,b)=>a/b),viM=pair(sumN(vmM,14),sTR,(a,b)=>a/b);
 const H14=hh(h,14),L14=ll(l,14),chop=sTR.map((s,i)=>s==null||H14[i]==null?null:100*Math.log10(s/(H14[i]-L14[i]))/Math.log10(14));
 const d=c.map((x,i)=>i?x-c[i-1]:null),up=d.map(x=>x==null?null:Math.max(x,0)),dn=d.map(x=>x==null?null:Math.max(-x,0)),su9=sumN(up,9),sd9=sumN(dn,9),cmo=pair(su9,sd9,(a,b)=>a+b===0?0:100*(a-b)/(a+b));
 const t1=emaN(c,18),t2=emaN(t1,18),t3=emaN(t2,18),trix=t3.map((x,i)=>x==null||t3[i-1]==null?null:100*(x-t3[i-1])/t3[i-1]),trixSig=emaN(trix,9);
 const s5=smaN(hl2,5),s34=smaN(hl2,34),ao=pair(s5,s34,(a,b)=>a-b);
 const mfm=bars.map(b=>b.high===b.low?0:((b.close-b.low)-(b.high-b.close))/(b.high-b.low)),mfv=mfm.map((m,i)=>m*v[i]),ad=cum(mfv);
 const cmf=pair(sumN(mfv,20),sumN(v,20),(a,b)=>a/b),chaikin=pair(emaN(ad,3),emaN(ad,10),(a,b)=>a-b);
 const efi=emaN(c.map((x,i)=>i?(x-c[i-1])*v[i]:null),13);
 const bop=bars.map(b=>b.high===b.low?0:(b.close-b.open)/(b.high-b.low)),bopS=smaN(bop,14);
 const HC14=hh(c,14),dd=c.map((x,i)=>HC14[i]==null?null:100*(x-HC14[i])/HC14[i]),ulcer=dd.map((_,i)=>{if(i<26)return null;const w=dd.slice(i-13,i+1);return Math.sqrt(w.reduce((s,x)=>s+x*x,0)/14);});
 const rsi=indicators(bars).rsi,rH=hh(rsi.map(x=>x??-Infinity),14).map((x,i)=>i<27?null:x),rL=ll(rsi.map(x=>x??Infinity),14).map((x,i)=>i<27?null:x);
 const srRaw=rsi.map((x,i)=>rH[i]==null?null:rH[i]===rL[i]?50:100*(x-rL[i])/(rH[i]-rL[i])),srK=smaN(srRaw,3),srD=smaN(srK,3);
 const ad1=emaN(emaN(d,25),13),ad2=emaN(emaN(d.map(x=>x==null?null:Math.abs(x)),25),13),tsi=pair(ad1,ad2,(a,b)=>b===0?0:100*a/b),tsiSig=emaN(tsi,13);
 const bbEma=emaN(c,13),bull=pair(h,bbEma,(a,b)=>a-b),bear=pair(l,bbEma,(a,b)=>a-b);
 const bp=bars.map((b,i)=>i?b.close-Math.min(b.low,c[i-1]):null),ut=bars.map((b,i)=>i?Math.max(b.high,c[i-1])-Math.min(b.low,c[i-1]):null),avg=n=>pair(sumN(bp,n),sumN(ut,n),(a,b)=>a/b),A7=avg(7),A14=avg(14),A28=avg(28),uo=A28.map((x,i)=>x==null?null:100*(4*A7[i]+2*A14[i]+x)/7);
 const AU=hh(h.map((x,i)=>x),15),aUp=h.map((_,i)=>{if(i<14)return null;const w=h.slice(i-14,i+1);return 100*w.lastIndexOf(Math.max(...w))/14;}),aDn=l.map((_,i)=>{if(i<14)return null;const w=l.slice(i-14,i+1);return 100*w.lastIndexOf(Math.min(...w))/14;}),aroonOsc=pair(aUp,aDn,(a,b)=>a-b);void AU;void N;void o;
 return {bbEma,bull,bear,smma,hma,dema,tema,ema20:e1,ribbon,lsma,atr22,ceLong,ceShort,ppo,ppoSig,ppoHist,atr14,natr,sd20,rvol,pvt,pvo,pvoSig,pvoHist,viP,viM,chop,cmo,trix,trixSig,ao,ad,mfv,cmf,chaikin,efi,bop,bopS,dd,ulcer,srRaw,srK,srD,tsi,tsiSig,uo,aroonOsc};
}
const MORE_NAMES={4:'SMMA/RMA 20',6:'HMA 20',7:'DEMA 20',8:'TEMA 20',10:'EMA Ribbon 10–50',18:'PPO 12/26/9',20:'Bull/Bear Power 13',28:'NATR 14',30:'StdDev 20',33:'RVOL 20',35:'PVT',36:'PVO 12/26/9',44:'Aroon Oscillator 14',45:'Vortex 14',46:'Choppiness 14',52:'LSMA 25',57:'StochRSI 14/14/3/3',59:'CMO 9',60:'TSI 25/13/13',61:'TRIX 18',62:'Ultimate Oscillator 7/14/28',63:'Awesome Oscillator 5/34',77:'Accumulation/Distribution',78:'CMF 20',79:'Chaikin Oscillator 3/10',81:'Elder Force Index 13',85:'Balance of Power',88:'Ulcer Index 14',89:'Chandelier Exit 22/3'};
const MORE_PANEL=[18,20,28,30,33,35,36,44,45,46,57,59,60,61,62,63,77,78,79,81,85,88];
function moreOverlays(id,X,t){const ink=palette.ink,ln=palette.line,mu=palette.muted;
 return id===4?[['SMMA 20',X.smma,'',ink],['SMA 20',X.sma20,'6 4',ln]]:id===6?[['HMA 20',X.hma,'',ink],['SMA 20',X.sma20,'6 4',ln]]:id===7?[['DEMA 20',X.dema,'',ink],['EMA 20',X.ema20,'6 4',ln]]:id===8?[['TEMA 20',X.tema,'',ink],['EMA 20',X.ema20,'6 4',ln]]:id===10?X.ribbon.map((a,k)=>[`EMA ${10*(k+1)}`,a,['','','','5 3','5 3'][k],[ink,ln,mu,ln,mu][k]]):id===52?[['LSMA 25',X.lsma,'',ink],['SMA 20',X.sma20,'6 4',ln]]:id===89?[[t('多头止损线','Long stop'),X.ceLong,'',ink],[t('空头止损线','Short stop'),X.ceShort,'5 3',ln]]:id===20?[['EMA 13',X.bbEma,'',ink]]:m3Overlays(id,X,t);}
function morePanels(X,t){const ink=palette.ink,ln=palette.line,mu=palette.muted,fK=v=>`${(v/1000).toFixed(0)}k`,fInt=v=>v==null?'—':Math.round(v).toLocaleString('en-US');
 return {18:{title:t('PPO 12/26/9 · %','PPO 12/26/9 · %'),series:[[t('柱','Hist'),X.ppoHist,'',ink,'bars'],['PPO',X.ppo,'',ink],['Signal',X.ppoSig,'5 3',ln]],zero:true,dp:2},
 20:{title:t('Bull/Bear Power 13 · 美元','Bull/Bear Power 13 · USD'),series:[['Bull',X.bull,'',ink],['Bear',X.bear,'5 3',ln]],zero:true,dp:2},
 28:{title:t('NATR 14 · %','NATR 14 · %'),series:[['NATR %',X.natr,'',ink]],floor:0,dp:2},
 30:{title:t('标准差 20 · 美元','StdDev 20 · USD'),series:[['StdDev',X.sd20,'',ink]],floor:0,dp:2},
 33:{title:t('RVOL 20 · 倍','RVOL 20 · ×'),series:[['RVOL',X.rvol,'',ink,'bars']],min:0,refs:[1],dp:2},
 35:{title:t('PVT · 累计（股）','PVT · cumulative shares'),series:[['PVT',X.pvt,'',ink]],dp:0,axis:fK,fmt:fInt},
 36:{title:t('PVO 12/26/9 · %','PVO 12/26/9 · %'),series:[[t('柱','Hist'),X.pvoHist,'',ink,'bars'],['PVO',X.pvo,'',ink],['Signal',X.pvoSig,'5 3',ln]],zero:true,dp:1},
 44:{title:'Aroon Oscillator 14',series:[['Osc',X.aroonOsc,'',ink]],min:-100,max:100,refs:[0],dp:0},
 45:{title:'Vortex 14',series:[['VI+',X.viP,'',ink],['VI−',X.viM,'5 3',ln]],refs:[1],dp:2},
 46:{title:'Choppiness Index 14',series:[['CHOP',X.chop,'',ink]],min:0,max:100,refs:[38.2,61.8],dp:1},
 57:{title:'StochRSI 14/14/3/3',series:[['%K',X.srK,'',ink],['%D',X.srD,'5 3',ln]],min:0,max:100,refs:[20,80],dp:0},
 59:{title:'CMO 9',series:[['CMO',X.cmo,'',ink]],min:-100,max:100,refs:[-50,50],zero:true,dp:0},
 60:{title:'TSI 25/13/13',series:[['TSI',X.tsi,'',ink],['Signal',X.tsiSig,'5 3',ln]],zero:true,dp:1},
 61:{title:t('TRIX 18 · %','TRIX 18 · %'),series:[['TRIX',X.trix,'',ink],['Signal 9',X.trixSig,'5 3',ln]],zero:true,dp:3},
 62:{title:'Ultimate Oscillator 7/14/28',series:[['UO',X.uo,'',ink]],min:0,max:100,refs:[30,70],dp:0},
 63:{title:t('Awesome Oscillator · 美元','Awesome Oscillator · USD'),series:[['AO',X.ao,'',ink,'bars']],zero:true,dp:2},
 77:{title:t('A/D 线 · 累计（股）','A/D line · cumulative shares'),series:[['A/D',X.ad,'',ink]],dp:0,axis:fK,fmt:fInt},
 78:{title:'CMF 20',series:[['CMF',X.cmf,'',ink]],zero:true,dp:3},
 79:{title:t('Chaikin Oscillator 3/10 · 股','Chaikin Oscillator 3/10 · shares'),series:[['CHO',X.chaikin,'',ink]],zero:true,dp:0,axis:fK,fmt:fInt},
 81:{title:t('Elder Force Index 13 · 美元×股','Elder Force Index 13 · USD×shares'),series:[['EFI',X.efi,'',ink]],zero:true,dp:0,axis:fK,fmt:fInt},
 85:{title:'Balance of Power',series:[['BOP',X.bop,'',ink,'bars'],['SMA 14',X.bopS,'',ink]],min:-1,max:1,zero:true,dp:2},
 88:{title:t('Ulcer Index 14 · %','Ulcer Index 14 · %'),series:[['UI',X.ulcer,'',ink]],floor:0,dp:2},...m3Panels(X,t)};}
// 2026-10-30 batch 3: remaining indicator topics on the same synthetic bars.
const BENCH_SEED=4242;
const lastIdx=a=>{for(let i=a.length-1;i>=0;i--)if(a[i]!=null)return i;return -1;};
const shift=(a,k)=>a.map((_,i)=>i-k>=0&&i-k<a.length?a[i-k]??null:null);
function linreg(w){const n=w.length,mx=(n-1)/2,my=w.reduce((s,y)=>s+y,0)/n;let sxy=0,sxx=0,syy=0;w.forEach((y,k)=>{sxy+=(k-mx)*(y-my);sxx+=(k-mx)**2;syy+=(y-my)**2;});const slope=sxy/sxx;return {slope,icpt:my-slope*mx,r2:syy===0?0:sxy*sxy/(sxx*syy),end:my+slope*(n-1-mx)};}
function rankAvg(w){const idx=w.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]),r=Array(w.length);for(let i=0;i<idx.length;){let j=i;while(j+1<idx.length&&idx[j+1][0]===idx[i][0])j++;for(let k=i;k<=j;k++)r[idx[k][1]]=(i+j)/2+1;i=j+1;}return r;}
function volStop(c,atr,mult){const N=c.length,stop=Array(N).fill(null),up=Array(N).fill(null);let mx=null,mn=null,s=null,u=true;for(let i=0;i<N;i++){if(atr[i]==null)continue;const m=atr[i]*mult;if(mx==null){mx=mn=c[i];}mx=Math.max(mx,c[i]);mn=Math.min(mn,c[i]);s=s==null?(u?mx-m:mn+m):u?Math.max(s,mx-m):Math.min(s,mn+m);const nu=c[i]-s>=0;if(nu!==u){mx=mn=c[i];s=nu?mx-m:mn+m;}u=nu;stop[i]=s;up[i]=u;}return {stop,up};}
function more3(bars){
 const c=bars.map(b=>b.close),o=bars.map(b=>b.open),h=bars.map(b=>b.high),l=bars.map(b=>b.low),v=bars.map(b=>b.volume),hl2=bars.map(b=>(b.high+b.low)/2),hlc3=bars.map(b=>(b.high+b.low+b.close)/3),N=bars.length,W0=72;
 const tr=bars.map((b,i)=>i?Math.max(b.high-b.low,Math.abs(b.high-c[i-1]),Math.abs(b.low-c[i-1])):b.high-b.low);
 const hh=(a,n)=>a.map((_,i)=>i<n-1||a.slice(i-n+1,i+1).some(x=>x==null)?null:Math.max(...a.slice(i-n+1,i+1))),ll=(a,n)=>a.map((_,i)=>i<n-1||a.slice(i-n+1,i+1).some(x=>x==null)?null:Math.min(...a.slice(i-n+1,i+1)));
 const mid=(n,src1=h,src2=l)=>pair(hh(src1,n),ll(src2,n),(a,b)=>(a+b)/2);
 // Ichimoku 9/26/52, displacement 26
 const tenkan=mid(9),kijun=mid(26),sB=mid(52),spanA=shift(pair(tenkan,kijun,(a,b)=>(a+b)/2),26),spanB=shift(sB,26),chikou=c.map((_,i)=>i+26<N?c[i+26]:null);
 // Alligator: SMMA of median price, shifted forward
 const jaw=shift(wilder(hl2,13),8),teeth=shift(wilder(hl2,8),5),lips=shift(wilder(hl2,5),3);
 // KAMA 10/2/30
 const kama=Array(N).fill(null);{const f=2/3,s=2/31;for(let i=10;i<N;i++){let vol=0;for(let k=i-9;k<=i;k++)vol+=Math.abs(c[k]-c[k-1]);const er=vol===0?0:Math.abs(c[i]-c[i-10])/vol,sc=(er*(f-s)+s)**2,prev=kama[i-1]??c[i-1];kama[i]=prev+sc*(c[i]-prev);}}
 // ALMA 9 / 0.85 / 6
 const almaW=(()=>{const m=.85*8,s=9/6;return Array.from({length:9},(_,k)=>Math.exp(-((k-m)**2)/(2*s*s)));})(),almaS=almaW.reduce((a,b)=>a+b,0),alma=c.map((_,i)=>i<8?null:c.slice(i-8,i+1).reduce((s,x,k)=>s+x*almaW[k],0)/almaS);
 // McGinley Dynamic 14 (seeded with EMA 14)
 const e14=emaN(c,14),mcg=Array(N).fill(null);for(let i=0;i<N;i++){if(e14[i]==null)continue;const p=mcg[i-1];mcg[i]=p==null?e14[i]:p+(c[i]-p)/(14*(c[i]/p)**4);}
 // Linear regression channel over the displayed window, slope and R² over 14
 const reg=linreg(c.slice(W0)),res=c.slice(W0).map((y,k)=>y-(reg.icpt+reg.slope*k)),rsd=Math.sqrt(res.reduce((s,x)=>s+x*x,0)/res.length);
 const lrMid=c.map((_,i)=>i<W0?null:reg.icpt+reg.slope*(i-W0)),lrUp=lrMid.map(x=>x==null?null:x+2*rsd),lrDn=lrMid.map(x=>x==null?null:x-2*rsd);
 const lr14=c.map((_,i)=>i<13?null:linreg(c.slice(i-13,i+1))),lrSlope=lr14.map(r=>r?r.slope:null),lrR2=lr14.map(r=>r?r.r2:null);
 // Benchmark (second synthetic asset): price relative and correlation 20
 const bench=sampleBars(N,BENCH_SEED).map(b=>b.close),rel=c.map((x,i)=>x/bench[i]),relS=smaN(rel,20);
 const corr=c.map((_,i)=>{if(i<19)return null;const a=c.slice(i-19,i+1),b=bench.slice(i-19,i+1),ma=a.reduce((s,x)=>s+x,0)/20,mb=b.reduce((s,x)=>s+x,0)/20;let sab=0,saa=0,sbb=0;for(let k=0;k<20;k++){sab+=(a[k]-ma)*(b[k]-mb);saa+=(a[k]-ma)**2;sbb+=(b[k]-mb)**2;}return sab/Math.sqrt(saa*sbb);});
 // Historical volatility 20, annualised for a 24/7 market (24×365 hourly bars)
 const lr=c.map((x,i)=>i?Math.log(x/c[i-1]):null),hv=lr.map((_,i)=>{if(i<20)return null;const w=lr.slice(i-19,i+1),m=w.reduce((s,x)=>s+x,0)/20;return 100*Math.sqrt(w.reduce((s,x)=>s+(x-m)**2,0)/20)*Math.sqrt(24*365);});
 // SMI 10/3/3 and SMI Ergodic 5/20/5
 const H10=hh(h,10),L10=ll(l,10),rr=c.map((x,i)=>H10[i]==null?null:x-(H10[i]+L10[i])/2),rng=pair(H10,L10,(a,b)=>a-b),smi=pair(emaN(emaN(rr,3),3),emaN(emaN(rng,3),3),(a,b)=>b===0?0:200*a/b),smiSig=emaN(smi,3);
 const pc=c.map((x,i)=>i?x-c[i-1]:null),erg=pair(emaN(emaN(pc,20),5),emaN(emaN(pc.map(x=>x==null?null:Math.abs(x)),20),5),(a,b)=>b===0?0:a/b),ergSig=emaN(erg,5);
 // Relative Vigor Index 10
 const sw=(a,i)=>(a[i]+2*a[i-1]+2*a[i-2]+a[i-3])/6,co=c.map((x,i)=>x-o[i]),hlr=h.map((x,i)=>x-l[i]),num=c.map((_,i)=>i<3?null:sw(co,i)),den=c.map((_,i)=>i<3?null:sw(hlr,i)),rvi=pair(sumN(num,10),sumN(den,10),(a,b)=>a/b),rviSig=rvi.map((x,i)=>i<3||[0,1,2,3].some(k=>rvi[i-k]==null)?null:sw(rvi,i));
 // Relative Volatility Index 10 / EMA 14
 const sd10=c.map((_,i)=>{if(i<9)return null;const w=c.slice(i-9,i+1),m=w.reduce((s,x)=>s+x,0)/10;return Math.sqrt(w.reduce((s,x)=>s+(x-m)**2,0)/10);}),rvU=emaN(sd10.map((s,i)=>s==null?null:pc[i]>0?s:0),14),rvD=emaN(sd10.map((s,i)=>s==null?null:pc[i]>0?0:s),14),rvix=pair(rvU,rvD,(a,b)=>a+b===0?50:100*a/(a+b));
 // RCI 9 (Spearman rank correlation between time and price)
 const rci=c.map((_,i)=>{const n=9;if(i<n-1)return null;const r=rankAvg(c.slice(i-n+1,i+1));let d2=0;r.forEach((x,k)=>d2+=(x-(k+1))**2);return 100*(1-6*d2/(n*(n*n-1)));});
 // Fisher Transform 9
 const fH=hh(hl2,9),fL=ll(hl2,9),fish=Array(N).fill(null),fTrig=Array(N).fill(null);{let val=0,f=0;for(let i=0;i<N;i++){if(fH[i]==null)continue;const r=fH[i]===fL[i]?0:(hl2[i]-fL[i])/(fH[i]-fL[i])-.5;val=Math.max(-.999,Math.min(.999,.66*r+.67*val));fTrig[i]=fish[i-1]??null;f=.5*Math.log((1+val)/(1-val))+.5*f;fish[i]=f;}}
 // DPO 21 (non-centred: close − SMA21 from 11 bars ago)
 const s21=smaN(c,21),dpo=c.map((x,i)=>i<11||s21[i-11]==null?null:x-s21[i-11]);
 // KST 10/15/20/30 with SMA 10/10/10/15, signal 9
 const roc=n=>c.map((x,i)=>i<n?null:100*(x/c[i-n]-1)),kst=(()=>{const r=[[10,10],[15,10],[20,10],[30,15]].map(([a,b])=>smaN(roc(a),b));return c.map((_,i)=>r.some(x=>x[i]==null)?null:r[0][i]+2*r[1][i]+3*r[2][i]+4*r[3][i]);})(),kstSig=smaN(kst,9);
 // PMO 35/20/10 (custom smoothing 2/n, seeded with first value)
 const csf=(a,n)=>{let s=null;return a.map(x=>{if(x==null)return null;s=s==null?x:s+(x-s)*2/n;return s;});},roc1=roc(1),pmo=csf(csf(roc1,35).map(x=>x==null?null:10*x),20),pmoSig=emaN(pmo,10);
 // Coppock: WMA10 of ROC14 + ROC11
 const r14=roc(14),r11=roc(11),cop=wmaN(pair(r14,r11,(a,b)=>a+b),10);
 // MACD-V: MACD 12/26 ÷ ATR 26 × 100, signal 9
 const atr26=wilder(tr,26),macdv=pair(pair(emaN(c,12),emaN(c,26),(a,b)=>a-b),atr26,(a,b)=>100*a/b),macdvSig=emaN(macdv,9),macdvHist=pair(macdv,macdvSig,(a,b)=>a-b);
 // Mass Index 9/25
 const e9=emaN(hlr,9),e99=emaN(e9,9),mass=sumN(pair(e9,e99,(a,b)=>a/b),25);
 // Klinger (TradingView built-in form): signed volume by HLC3 change, EMA34 − EMA55, signal EMA13
 const sv=v.map((x,i)=>i&&hlc3[i]-hlc3[i-1]>=0?x:-x).map((x,i)=>i?x:null),kvo=pair(emaN(sv,34),emaN(sv,55),(a,b)=>a-b),kvoSig=emaN(kvo,13);
 // Ease of Movement 14 (divisor 10 000)
 const eom=smaN(c.map((_,i)=>i?1e4*(hl2[i]-hl2[i-1])*(h[i]-l[i])/v[i]:null),14);
 // PVI / NVI (start 1000)
 const pvi=[1000],nvi=[1000];for(let i=1;i<N;i++){const ch=(c[i]-c[i-1])/c[i-1];pvi.push(v[i]>v[i-1]?pvi[i-1]*(1+ch):pvi[i-1]);nvi.push(v[i]<v[i-1]?nvi[i-1]*(1+ch):nvi[i-1]);}
 // Relative volume at time: volume ÷ average volume at the same UTC hour on the previous 3 days
 const rvat=v.map((x,i)=>i<72?null:x/((v[i-24]+v[i-48]+v[i-72])/3));
 // TTM Squeeze: BB 20/2 inside KC 20 (SMA ± 1.5 × SMA of TR); momentum = linreg of close − mean(Donchian mid, SMA20)
 const s20=smaN(c,20),sd20=c.map((_,i)=>{if(i<19)return null;const w=c.slice(i-19,i+1),m=w.reduce((s,x)=>s+x,0)/20;return Math.sqrt(w.reduce((s,x)=>s+(x-m)**2,0)/20);}),atrS20=smaN(tr,20);
 const sqBU=pair(s20,sd20,(m,s)=>m+2*s),sqBL=pair(s20,sd20,(m,s)=>m-2*s),sqKU=pair(s20,atrS20,(m,a)=>m+1.5*a),sqKL=pair(s20,atrS20,(m,a)=>m-1.5*a);
 const sqOn=c.map((_,i)=>sqBU[i]==null||sqKU[i]==null?null:sqBL[i]>sqKL[i]&&sqBU[i]<sqKU[i]),dm20=mid(20),sqSrc=c.map((x,i)=>dm20[i]==null||s20[i]==null?null:x-(dm20[i]+s20[i])/2),sqMom=sqSrc.map((_,i)=>i<19||sqSrc.slice(i-19,i+1).some(x=>x==null)?null:linreg(sqSrc.slice(i-19,i+1)).end);
 const sqDotOn=sqOn.map(x=>x===true?0:null),sqDotOff=sqOn.map(x=>x===false?0:null);
 // Chande Kroll Stop 10/1/9
 const atr10=wilder(tr,10),fhs=pair(hh(h,10),atr10,(a,b)=>a-b),fls=pair(ll(l,10),atr10,(a,b)=>a+b),ckShort=hh(fhs,9),ckLong=ll(fls,9);
 // ATR trailing stop (ATR14 × 3) and Volatility Stop (ATR20 × 2), both on close with ratchet
 const at=volStop(c,wilder(tr,14),3),vs=volStop(c,wilder(tr,20),2);
 const split=(S,u)=>[S.stop.map((s,i)=>S.up[i]===u?s:null)];
 // Anchored VWAP from the lowest low of the displayed window
 let anchor=W0;for(let i=W0;i<N;i++)if(l[i]<l[anchor])anchor=i;
 const avwap=Array(N).fill(null);{let pv=0,vv=0;for(let i=anchor;i<N;i++){pv+=hlc3[i]*v[i];vv+=v[i];avwap[i]=pv/vv;}}
 // Standard floor pivots from the previous UTC day
 const day=i=>bars[i].time.slice(0,10),days=[...new Set(bars.map(b=>b.time.slice(0,10)))],dHLC={};for(const d of days){const idx=bars.map((b,i)=>i).filter(i=>day(i)===d);dHLC[d]={H:Math.max(...idx.map(i=>h[i])),L:Math.min(...idx.map(i=>l[i])),C:c[idx.at(-1)]};}
 const piv=bars.map((_,i)=>{const k=days.indexOf(day(i));if(k<1)return null;const {H,L,C}=dHLC[days[k-1]],P=(H+L+C)/3;return {P,R1:2*P-L,S1:2*P-H,R2:P+(H-L),S2:P-(H-L)};}),pv=k=>piv.map(x=>x?x[k]:null);
 // Pivot highs/lows 5/5, Williams fractals 2/2
 const pivHL=(L,R)=>{const ph=Array(N).fill(null),pl=Array(N).fill(null);for(let i=L;i<N-R;i++){const wh=h.slice(i-L,i+R+1),wl=l.slice(i-L,i+R+1);if(h[i]===Math.max(...wh)&&wh.indexOf(h[i])===L)ph[i]=h[i];if(l[i]===Math.min(...wl)&&wl.indexOf(l[i])===L)pl[i]=l[i];}return {ph,pl};};
 const p55=pivHL(5,5),fr=pivHL(2,2);
 // Fibonacci retracement of the displayed window's swing (low → high or high → low, whichever came later)
 let hiI=W0,loI=W0;for(let i=W0;i<N;i++){if(h[i]>h[hiI])hiI=i;if(l[i]<l[loI])loI=i;}const fibUp=hiI>loI,fbH=h[hiI],fbL=l[loI],FIBS=[0,.236,.382,.5,.618,.786,1];
 const fib=FIBS.map(r=>c.map((_,i)=>i<W0?null:fibUp?fbH-r*(fbH-fbL):fbL+r*(fbH-fbL)));
 // ZigZag 1.5% on highs/lows (last leg is provisional)
 const zz=[];{let dir=0,ext=0,extI=0;const dev=.015;for(let i=0;i<N;i++){if(!dir){if(h[i]>=h[0]*(1+dev)){dir=1;zz.push([0,l[0]]);ext=h[i];extI=i;}else if(l[i]<=l[0]*(1-dev)){dir=-1;zz.push([0,h[0]]);ext=l[i];extI=i;}continue;}
   if(dir===1){if(h[i]>ext){ext=h[i];extI=i;}else if(l[i]<=ext*(1-dev)){zz.push([extI,ext]);dir=-1;ext=l[i];extI=i;}}else{if(l[i]<ext){ext=l[i];extI=i;}else if(h[i]>=ext*(1+dev)){zz.push([extI,ext]);dir=1;ext=h[i];extI=i;}}}
  zz.push([extI,ext,'tentative']);}
 const zzLine=Array(N).fill(null);for(let k=1;k<zz.length;k++){const [a,va]=zz[k-1],[b,vb]=zz[k];for(let i=a;i<=b;i++)zzLine[i]=va+(vb-va)*(b===a?0:(i-a)/(b-a));}
 return {tenkan,kijun,spanA,spanB,chikou,jaw,teeth,lips,kama,alma,mcg,lrMid,lrUp,lrDn,lrSlope,lrR2,reg,rsd,bench,rel,relS,corr,hv,smi,smiSig,erg,ergSig,rvi,rviSig,rvix,rci,fish,fTrig,dpo,kst,kstSig,pmo,pmoSig,cop,macdv,macdvSig,macdvHist,atr26,mass,kvo,kvoSig,eom,pvi,nvi,rvat,sqBU,sqBL,sqKU,sqKL,sqOn,sqMom,sqDotOn,sqDotOff,ckShort,ckLong,atStop:at.stop,atUp:at.up,vsStop:vs.stop,vsUp:vs.up,anchor,avwap,pvP:pv('P'),pvR1:pv('R1'),pvS1:pv('S1'),pvR2:pv('R2'),pvS2:pv('S2'),ph:p55.ph,pl:p55.pl,frH:fr.ph,frL:fr.pl,fib,fibUp,fibHi:fbH,fibLo:fbL,fibHiI:hiI,fibLoI:loI,zz,zzLine,s20};
}
const M3_NAMES={31:'Historical Volatility 20',40:'Price Relative',47:'Ichimoku 9/26/52',48:'Williams Alligator 13/8/5',49:'KAMA 10/2/30',50:'ALMA 9/0.85/6',51:'McGinley Dynamic 14',53:'Linear Regression Channel',54:'Linear Regression Slope 14',55:'Linear Regression R² 14',56:'Correlation Coefficient 20',64:'SMI 10/3/3',65:'SMI Ergodic 5/20/5',66:'Relative Vigor Index 10',67:'Relative Volatility Index 10/14',68:'RCI 9',69:'Fisher Transform 9',70:'DPO 21',71:'KST',73:'PMO 35/20/10',74:'Coppock Curve 14/11/10',75:'MACD-V 12/26/9',76:'Mass Index 9/25',80:'Klinger Oscillator 34/55/13',82:'Ease of Movement 14',83:'Positive Volume Index',84:'Negative Volume Index',86:'Relative Volume at Time',87:'TTM Squeeze 20',90:'Chande Kroll Stop 10/1/9',91:'ATR Trailing Stop 14×3',92:'Volatility Stop 20×2',93:'Anchored VWAP',94:'Pivot Points Standard',95:'Pivot Points High/Low 5/5',96:'Fibonacci Retracement',97:'Williams Fractals 2/2',98:'ZigZag 1.5%'};
const M3_PANEL=[31,40,54,55,56,64,65,66,67,68,69,70,71,73,74,75,76,80,82,83,84,86,87];
function m3Overlays(id,X,t){const ink=palette.ink,ln=palette.line,mu=palette.muted,up=palette.up,dn=palette.down;
 const two=(S,U,a,b)=>[[a,S.map((s,i)=>U[i]===true?s:null),'',ink],[b,S.map((s,i)=>U[i]===false?s:null),'5 3',ln]];
 return id===47?[[t('转换线 9','Tenkan 9'),X.tenkan,'',ink],[t('基准线 26','Kijun 26'),X.kijun,'6 4',ln],[t('先行带A','Span A'),X.spanA,'',mu],[t('先行带B','Span B'),X.spanB,'3 3',mu],[t('迟行线','Chikou'),X.chikou,'1 3',ln]]
 :id===48?[[t('颚 13/8','Jaw 13/8'),X.jaw,'',ln],[t('齿 8/5','Teeth 8/5'),X.teeth,'5 3',mu],[t('唇 5/3','Lips 5/3'),X.lips,'',ink]]
 :id===49?[['KAMA 10/2/30',X.kama,'',ink],['SMA 20',X.sma20,'6 4',ln]]:id===50?[['ALMA 9',X.alma,'',ink],['SMA 20',X.sma20,'6 4',ln]]:id===51?[['McGinley 14',X.mcg,'',ink],['EMA 20',X.ema20,'6 4',ln]]
 :id===53?[[t('上通道 +2σ','Upper +2σ'),X.lrUp,'5 3',ln],[t('回归线','Regression'),X.lrMid,'',ink],[t('下通道 −2σ','Lower −2σ'),X.lrDn,'5 3',ln]]
 :id===87?[[t('布林上轨','BB upper'),X.sqBU,'5 3',ln],[t('布林下轨','BB lower'),X.sqBL,'5 3',ln],[t('肯特纳上轨','KC upper'),X.sqKU,'2 3',mu],[t('肯特纳下轨','KC lower'),X.sqKL,'2 3',mu]]
 :id===90?[[t('多头止损','Stop long'),X.ckLong,'',ink],[t('空头止损','Stop short'),X.ckShort,'5 3',ln]]
 :id===91?two(X.atStop,X.atUp,t('向上跟踪','Up-trend stop'),t('向下跟踪','Down-trend stop')):id===92?two(X.vsStop,X.vsUp,t('向上跟踪','Up-trend stop'),t('向下跟踪','Down-trend stop'))
 :id===93?[[t('锚定VWAP','Anchored VWAP'),X.avwap,'',ink]]
 :id===94?[['R1',X.pvR1,'5 3',ln],['P',X.pvP,'',ink],['S1',X.pvS1,'5 3',ln]]
 :id===95?[[t('枢轴高点','Pivot high'),X.ph.map(x=>x==null?null:x+.25),'',dn,'dots'],[t('枢轴低点','Pivot low'),X.pl.map(x=>x==null?null:x-.25),'',up,'dots']]
 :id===97?[[t('向上分形','Up fractal'),X.frH.map(x=>x==null?null:x+.25),'',dn,'dots'],[t('向下分形','Down fractal'),X.frL.map(x=>x==null?null:x-.25),'',up,'dots']]
 :id===96?X.fib.map((a,k)=>[`${[0,23.6,38.2,50,61.8,78.6,100][k]}%`,a,k===0||k===6?'':'5 3',k===0||k===6?ink:k===4?mu:ln])
 :id===98?[['ZigZag 1.5%',X.zzLine,'',ink]]:[];}
function m3Panels(X,t){const ink=palette.ink,ln=palette.line,mu=palette.muted,fInt=v=>v==null?'—':Math.round(v).toLocaleString('en-US'),fK=v=>`${(v/1000).toFixed(0)}k`;
 return {31:{title:t('历史波动率 20 · 年化 %','Historical volatility 20 · annualised %'),series:[['HV %',X.hv,'',ink]],floor:0,dp:1},
 40:{title:t('相对表现 = 本资产 ÷ 模拟基准','Price relative = asset ÷ synthetic benchmark'),series:[[t('比值','Ratio'),X.rel,'',ink],['SMA 20',X.relS,'5 3',ln]],dp:3},
 54:{title:t('回归斜率 14 · 美元/根','Regression slope 14 · USD per bar'),series:[[t('斜率','Slope'),X.lrSlope,'',ink]],zero:true,dp:3},
 55:{title:'R² 14',series:[['R²',X.lrR2,'',ink]],min:0,max:1,refs:[.5],dp:2},
 56:{title:t('相关系数 20 · 与模拟基准','Correlation 20 · vs synthetic benchmark'),series:[['r',X.corr,'',ink]],min:-1,max:1,zero:true,dp:2},
 64:{title:'SMI 10/3/3',series:[['SMI',X.smi,'',ink],['Signal',X.smiSig,'5 3',ln]],refs:[-40,40],zero:true,dp:0},
 65:{title:'SMI Ergodic 5/20/5',series:[['SMI',X.erg,'',ink],['Signal',X.ergSig,'5 3',ln]],zero:true,dp:2},
 66:{title:'Relative Vigor Index 10',series:[['RVI',X.rvi,'',ink],['Signal',X.rviSig,'5 3',ln]],zero:true,dp:2},
 67:{title:'Relative Volatility Index 10/14',series:[['RVI',X.rvix,'',ink]],min:0,max:100,refs:[50],dp:0},
 68:{title:'RCI 9',series:[['RCI',X.rci,'',ink]],min:-100,max:100,refs:[-80,80],zero:true,dp:0},
 69:{title:'Fisher Transform 9',series:[['Fisher',X.fish,'',ink],['Trigger',X.fTrig,'5 3',ln]],zero:true,dp:2},
 70:{title:t('DPO 21 · 美元','DPO 21 · USD'),series:[['DPO',X.dpo,'',ink]],zero:true,dp:2},
 71:{title:'KST 10/15/20/30',series:[['KST',X.kst,'',ink],['Signal 9',X.kstSig,'5 3',ln]],zero:true,dp:1},
 73:{title:'PMO 35/20/10',series:[['PMO',X.pmo,'',ink],['Signal 10',X.pmoSig,'5 3',ln]],zero:true,dp:2},
 74:{title:'Coppock 14/11/10',series:[['Coppock',X.cop,'',ink]],zero:true,dp:2},
 75:{title:'MACD-V 12/26/9',series:[[t('柱','Hist'),X.macdvHist,'',ink,'bars'],['MACD-V',X.macdv,'',ink],['Signal',X.macdvSig,'5 3',ln]],refs:[-50,50],zero:true,dp:0},
 76:{title:'Mass Index 9/25',series:[['Mass',X.mass,'',ink]],refs:[26.5,27],dp:2},
 80:{title:t('Klinger 34/55/13 · 股','Klinger 34/55/13 · shares'),series:[['KVO',X.kvo,'',ink],['Signal',X.kvoSig,'5 3',ln]],zero:true,dp:0,axis:fK,fmt:fInt},
 82:{title:'Ease of Movement 14',series:[['EOM',X.eom,'',ink]],zero:true,dp:2},
 83:{title:t('PVI · 起点1000','PVI · starts at 1000'),series:[['PVI',X.pvi,'',ink]],dp:1},
 84:{title:t('NVI · 起点1000','NVI · starts at 1000'),series:[['NVI',X.nvi,'',ink]],dp:1},
 86:{title:t('同时段相对成交量 · 倍','Relative volume at time · ×'),series:[['RVOL',X.rvat,'',ink,'bars']],min:0,refs:[1],dp:2},
 87:{title:t('TTM Squeeze · 动量（美元）','TTM Squeeze · momentum (USD)'),series:[[t('动量','Momentum'),X.sqMom,'',ink,'bars'],[t('挤压中','Squeeze on'),X.sqDotOn,'',palette.down,'dots'],[t('未挤压','Squeeze off'),X.sqDotOff,'',palette.up,'dots']],zero:true,dp:2}};}
function m3Readout(id,X,i,t){const f=v=>v==null?'—':v.toFixed(2),win=(a)=>a.map((v,k)=>[k,v]).filter(([k,v])=>k>=72&&v!=null);
 if(id===95||id===97){const H=win(id===95?X.ph:X.frH),L=win(id===95?X.pl:X.frL),lag=id===95?5:2;return t(`图中共标出 ${H.length} 个高点、${L.length} 个低点；最右边 ${lag} 根之内不会出现标记，因为右侧还没有足够K线确认`,`${H.length} highs and ${L.length} lows are marked; none can appear in the last ${lag} bars because the right side is not yet confirmed`);}
 if(id===98){const z=X.zz.filter(p=>p[0]>=72),last=X.zz.at(-1);return t(`窗口内有 ${z.length} 个转折点；最后一段从 ${f(X.zz.at(-2)[1])} 到 ${f(last[1])} 仍是暂定的，后续K线可能改写它`,`${z.length} turning points fall in the window; the last leg from ${f(X.zz.at(-2)[1])} to ${f(last[1])} is still provisional and later bars may redraw it`);}
 if(id===96)return t(`高点 ${f(X.fibHi)}、低点 ${f(X.fibLo)}，${X.fibUp?'先低后高，从高点向下量回撤':'先高后低，从低点向上量反弹'}；61.8% 位于 ${f(X.fib[4][i])}`,`High ${f(X.fibHi)}, low ${f(X.fibLo)}; ${X.fibUp?'low came first, so retracements are measured down from the high':'high came first, so retracements are measured up from the low'}. 61.8% sits at ${f(X.fib[4][i])}`);
 if(id===87)return t(`${X.sqOn[i]?'布林带在肯特纳通道之内（挤压中）':'布林带不在肯特纳通道之内（未挤压）'}，动量 ${f(X.sqMom[i])}`,`${X.sqOn[i]?'Bollinger Bands inside Keltner Channel (squeeze on)':'Bollinger Bands not inside Keltner Channel (squeeze off)'}, momentum ${f(X.sqMom[i])}`);
 if(id===93)return t(`锚点是窗口内最低价那一根（${bars0time(X.anchor)}），VWAP ${f(X.avwap[i])}`,`Anchored at the window’s lowest-low bar (${bars0time(X.anchor)}); VWAP ${f(X.avwap[i])}`);
 if(id===91||id===92){const S=id===91?X.atStop:X.vsStop,U=id===91?X.atUp:X.vsUp;return t(`止损线 ${f(S[i])}，${U[i]?'在价格下方（向上跟踪）':'在价格上方（向下跟踪）'}`,`Stop ${f(S[i])}, ${U[i]?'below price (tracking up)':'above price (tracking down)'}`);}
 return null;}
const bars0time=i=>sampleBars()[i].time.slice(5,16).replace('T',' ');

const EXTRA_NAMES={3:'WMA 20',5:'VWMA 20',13:'Stochastic 14/3/3',14:'Williams %R 14',15:'CCI 20',16:'ROC 10',17:'Momentum 10',19:'MFI 14',22:'BBW 20/2',23:'%B 20/2',24:'Donchian 20',25:'Keltner 20 · ATR10×2',26:'Envelope SMA20 ±3%',34:'OBV',38:'Parabolic SAR',39:'Supertrend 10/3',41:'ADX 14',42:'DMI 14',43:'Aroon 14',...MORE_NAMES,...M3_NAMES};
export const extraChartIds=Object.freeze(Object.keys(EXTRA_NAMES).map(Number));
const PANEL_IDS=[13,14,15,16,17,19,22,23,34,41,42,43,...MORE_PANEL,...M3_PANEL];
function extraOverlays(id,X,t){const bb=[[t('上轨 BB20·2σ','Upper BB20·2σ'),X.bbU,'5 3',palette.line],[t('中轨 SMA20','Middle SMA20'),X.sma20,'',palette.ink],[t('下轨','Lower'),X.bbL,'5 3',palette.line]];
 return id===3?[['WMA 20',X.wma,'',palette.ink]]:id===5?[['VWMA 20',X.vwma,'',palette.ink],['SMA 20',X.sma20,'6 4',palette.line]]:id===22||id===23?bb:id===24?[[t('上轨 20根最高','Upper 20-bar high'),X.dcU,'5 3',palette.line],[t('中线','Middle'),X.dcM,'',palette.ink],[t('下轨 20根最低','Lower 20-bar low'),X.dcL,'5 3',palette.line]]:id===25?[[t('上轨','Upper'),X.kcU,'5 3',palette.line],['EMA 20',X.kcM,'',palette.ink],[t('下轨','Lower'),X.kcL,'5 3',palette.line]]:id===26?[['+3%',X.envU,'5 3',palette.line],['SMA 20',X.sma20,'',palette.ink],['−3%',X.envL,'5 3',palette.line]]:id===38?[['SAR 0.02/0.02/0.20',X.sar,'',palette.ink,'dots']]:id===39?[[t('向上跟踪','Up-trend line'),X.st.map((s,i)=>X.stDir[i]===1?s:null),'',palette.ink],[t('向下跟踪','Down-trend line'),X.st.map((s,i)=>X.stDir[i]===-1?s:null),'5 3',palette.line]]:moreOverlays(id,X,t);}
const f2=v=>v==null?'—':v.toFixed(2),fInt=v=>v==null?'—':Math.round(v).toLocaleString('en-US'),fK=v=>`${(v/1000).toFixed(0)}k`;
function extraPanel(id,X,t){const ink=palette.ink,ln=palette.line,mu=palette.muted;
 return {13:{title:'Stochastic 14/3/3',series:[['%K',X.stK,'',ink],['%D',X.stD,'5 3',ln]],min:0,max:100,refs:[20,80],dp:0},
 14:{title:'Williams %R 14',series:[['%R',X.wr,'',ink]],min:-100,max:0,refs:[-80,-20],dp:0},
 15:{title:'CCI 20 · HLC3',series:[['CCI',X.cci,'',ink]],refs:[-100,100],zero:true,dp:0},
 16:{title:t('ROC 10 · %','ROC 10 · %'),series:[['ROC %',X.roc,'',ink]],zero:true,dp:2},
 17:{title:t('Momentum 10 · 美元','Momentum 10 · USD'),series:[['MOM',X.mom,'',ink]],zero:true,dp:2},
 19:{title:'MFI 14 · HLC3',series:[['MFI',X.mfi,'',ink]],min:0,max:100,refs:[20,80],dp:0},
 22:{title:t('BBW 20/2 · %（上轨−下轨）÷中轨','BBW 20/2 · % (upper−lower)/middle'),series:[['BBW %',X.bbw,'',ink]],floor:0,dp:2},
 23:{title:'%B 20/2',series:[['%B',X.pctB,'',ink]],refs:[0,.5,1],dp:2},
 34:{title:t('OBV · 累计成交量（股）','OBV · cumulative shares'),series:[['OBV',X.obv,'',ink]],dp:0,axis:fK,fmt:fInt},
 41:{title:'ADX 14',series:[['ADX',X.adx,'',ink]],min:0,refs:[20,25],dp:0},
 42:{title:'DMI 14',series:[['+DI',X.pDI,'',ink],['−DI',X.mDI,'5 3',ln],['ADX',X.adx,'2 3',mu]],min:0,dp:0},
 43:{title:'Aroon 14',series:[['Up',X.aroonUp,'',ink],['Down',X.aroonDn,'5 3',ln]],min:0,max:100,dp:0},...morePanels(X,t)}[id];}
function extraPanelSvg(id,X,t,start,n,plot,text){const P=extraPanel(id,X,t),fmt=P.fmt||(v=>v==null?'—':v.toFixed(P.dp)),axis=P.axis||(v=>v.toFixed(P.dp)),ov=P.series.flatMap(s=>s[1].slice(start,start+n).filter(v=>v!=null)).concat(P.refs||[]);if(P.zero)ov.push(0);
 let min=P.min??Math.min(...ov),max=P.max??Math.max(...ov);const pad=Math.max((max-min)*.08,1e-6);if(P.min==null)min-=pad;if(P.max==null)max+=pad;if(P.floor!=null)min=Math.max(min,P.floor);max=Math.max(max,min+.01);
 const top=400,bottom=526,y=v=>bottom-(v-min)/(max-min)*(bottom-top);let svg='';const refY=(P.refs||[]).map(y);for(let k=0;k<3;k++){const v=min+(max-min)*k/2;svg+=`<path d="M44 ${y(v)}H668" stroke="${palette.grid}"/>`+(refY.some(r=>Math.abs(r-y(v))<13)?'':text(680,y(v)+4,axis(v)));}
 for(const r of P.refs||[])svg+=`<path d="M44 ${y(r)}H668" stroke="${palette.muted}" stroke-dasharray="4 4"/>`+text(680,y(r)+4,String(r));
 if(P.zero&&min<0&&max>0)svg+=`<path d="M44 ${y(0)}H668" stroke="${palette.muted}"/>`;
 P.series.forEach(([,a,dash,color,kind])=>{if(kind==='bars'){const base=Math.max(min,Math.min(max,P.min!=null&&P.min>=0?P.min:0));a.slice(start,start+n).forEach((v,i)=>{if(v==null)return;const cx=52+(i+.5)*608/Math.max(48,n),yy=y(v),y0=y(base);svg+=`<rect x="${(cx-3).toFixed(2)}" y="${Math.min(yy,y0).toFixed(2)}" width="6" height="${Math.max(.7,Math.abs(yy-y0)).toFixed(2)}" fill="${v>=base&&!(P.refs||[]).includes(1)||v>=1?palette.up:palette.down}" opacity=".7"/>`;});}else if(kind==='dots'){a.slice(start,start+n).forEach((v,i)=>{if(v==null)return;svg+=`<circle cx="${(52+(i+.5)*608/Math.max(48,n)).toFixed(2)}" cy="${y(v).toFixed(2)}" r="2.6" fill="${color}"/>`;});}else svg+=plot(a,y,color,dash);});svg+=text(18,389,P.title);
 return {svg,legend:`${P.title}: ${P.series.map(([name,a])=>`${name} ${fmt(a[start+n-1])}`).join(' / ')}`};}
function extraReadout(id,X,i,t){{const r=m3Readout(id,X,i,t);if(r!=null)return r;}if(PANEL_IDS.includes(id)){const P=extraPanel(id,X,t),fmt=P.fmt||(v=>v==null?'—':v.toFixed(2));return P.series.map(([name,a])=>`${name} ${fmt(a[i])}`).join(t('、',', '));}
 if(id===38)return X.sarUp[i]?t(`SAR ${f2(X.sar[i])}（点在K线下方，向上跟踪）`,`SAR ${f2(X.sar[i])} (below the candle, tracking upward)`):t(`SAR ${f2(X.sar[i])}（点在K线上方，向下跟踪）`,`SAR ${f2(X.sar[i])} (above the candle, tracking downward)`);
 return extraOverlays(id,X,t).filter(o=>o[1][i]!=null).map(([name,a])=>`${name} ${f2(a[i])}`).join(t('、',', '));}
const EXTRA_READING={
3:['黑线是20期加权均线：最新一根收盘权重20，最早一根权重1。它比同长度SMA更贴近近期价格，但仍是过去价格的平均，会滞后。','The black line is a 20-bar WMA: the newest close carries weight 20 and the oldest weight 1. It hugs recent prices more than an SMA of equal length, yet still averages the past and lags.'],
5:['黑线是20期VWMA，每根收盘按该根成交量加权；蓝灰虚线是同期SMA作对照。两线分开，说明高量K线的收盘价把平均拉向自己，不代表资金净流入。','Black: 20-bar VWMA, each close weighted by that bar’s volume; blue-gray dashed: 20-bar SMA for comparison. A gap means high-volume closes pull the average toward them, not net money inflow.'],
13:['副图黑线%K是原始位置的3期平滑，蓝灰虚线%D是%K的3期平均；80/20虚线只是常用参考。读数表示收盘在近14根高低区间中的位置，不是涨跌幅。','Below: black %K (raw position smoothed over 3 bars) and blue-gray dashed %D (3-bar average of %K). The 80/20 lines are common references. Readings locate the close inside the 14-bar range; they are not returns.'],
14:['副图刻度上0下−100，−20、−80虚线是常用参考。−10比−90更靠近最近14根区间的顶部，负号不代表下跌。','The lower scale runs from 0 at the top to −100 at the bottom; −20 and −80 are common references. −10 sits nearer the top of the 14-bar range than −90; the minus sign does not mean a decline.'],
15:['副图以0为中线，±100虚线是常用观察门槛，读数没有固定上下限。它衡量典型价（HLC3）偏离20期均值的程度，并用平均偏差标准化。','Zero is the centre line and ±100 are common thresholds; the value has no fixed bounds. It measures how far typical price (HLC3) deviates from its 20-bar mean, scaled by mean deviation.'],
16:['副图是当前收盘相对10根之前收盘的百分比变化；0线以上表示比10根前高。单位是%，基准每根都向前移动。','The panel shows the percentage change of the close versus the close 10 bars earlier; above zero means higher than then. Units are %, and the reference bar moves forward each bar.'],
17:['副图是当前收盘减去10根之前收盘的差值，单位是美元；0线以上表示比10根前高。它与ROC同源，但显示差价而非百分比。','The panel shows the close minus the close 10 bars earlier, in USD; above zero means higher than then. It shares ROC’s idea but shows a price difference instead of a percentage.'],
19:['副图0—100，80/20虚线是常用参考。它把典型价×成交量按典型价上升或下降分开累计14根，读数不是实际流入金额。','The 0–100 panel uses 80/20 as common references. It sums typical price × volume over 14 bars, split by whether typical price rose or fell; the value is not an actual inflow amount.'],
22:['主图画出同参数布林带，副图是上下轨距离除以中轨，以%显示（部分平台显示为小数比例）。数值越低表示近期波动越收窄，没有方向含义。','The price panel shows matching Bollinger Bands; the lower panel is band distance divided by the middle band, in % (some platforms show a decimal ratio). Lower values mean narrower recent volatility, with no direction implied.'],
23:['主图画出同参数布林带。副图1表示收盘正好在上轨，0在下轨，0.5在中轨；大于1或小于0表示收在轨道外。','The price panel shows matching Bollinger Bands. Below, 1 means the close sits on the upper band, 0 on the lower, 0.5 on the middle; above 1 or below 0 means it closed outside.'],
24:['上下蓝灰虚线是最近20根（本图含当前根）的最高价和最低价，黑线是两者中点，不是均价。边线呈台阶状，因为旧极值移出窗口前不会变化。','Blue-gray dashed lines are the highest high and lowest low of the latest 20 bars (including the current bar here); the black line is their midpoint, not an average close. Steps appear because an old extreme stays until it leaves the window.'],
25:['黑线是20期EMA，上下蓝灰虚线是EMA±2倍ATR(10)。轨道宽度随ATR扩张或收缩，表示波动大小，不表示方向。','The black line is a 20-bar EMA; blue-gray dashed bands sit at EMA ± 2 × ATR(10). Width follows ATR, measuring volatility rather than direction.'],
26:['黑线是20期SMA，上下虚线固定为中线的±3%。宽度只与中线水平成比例，不随波动变化，这是它与布林带的主要区别。','Black: 20-bar SMA; dashed lines sit a fixed ±3% away. Width scales only with the middle line, not with volatility, which is the key difference from Bollinger Bands.'],
34:['副图是累计值：收盘高于前一根就加整根成交量，低于就减，平收不变。绝对数取决于起算点（本例从第一根模拟K线起算），先看方向与高低点。','The panel accumulates volume: add the whole bar’s volume on a higher close, subtract on a lower close, add nothing when unchanged. The level depends on the starting bar (the first synthetic bar here); read direction and swings first.'],
38:['小圆点是抛物线SAR：点在K线下方表示算法向上跟踪，在上方表示向下跟踪；某根K线的最低（或最高）触及圆点时，下一根翻到另一侧。本例按常见Wilder定义计算（起始0.02、增量0.02、上限0.20），各平台初始化细节可能不同。','Dots are Parabolic SAR: below the candles the algorithm tracks upward, above them downward. When a bar’s low (or high) touches the dot, the next dot flips side. Computed with the common Wilder rules (start 0.02, step 0.02, max 0.20); platforms may initialise differently.'],
39:['黑实线在K线下方表示向上跟踪，蓝灰虚线在上方表示向下跟踪；收盘越过跟踪线才换边。线值由(最高+最低)÷2 ± 3倍ATR(10)按沿用前值的规则得出，不是每根直接画中点±ATR。','The black solid line below price tracks an up-trend; the blue-gray dashed line above tracks a down-trend. Sides switch only when a close crosses the line. Values come from (high+low)/2 ± 3 × ATR(10) with carry-forward rules, not a fresh midpoint ± ATR each bar.'],
41:['副图黑线ADX只衡量趋势强弱，不分涨跌；20、25虚线是经验参考。价格下跌时ADX同样可能上升。','The lower black ADX line measures trend strength only, not direction; 20 and 25 are rules of thumb. ADX can rise while price falls.'],
42:['黑线+DI、蓝灰虚线−DI分别比较向上与向下的运动，灰色点线是ADX强度。两条DI交叉只说明计算窗口内哪个方向的运动更大。','Black +DI and blue-gray dashed −DI compare upward and downward movement; the gray dotted line is ADX strength. A DI cross only says which direction moved more within the window.'],
43:['黑线Up、蓝灰虚线Down衡量最近15根（长度14）里最高点、最低点距今多久：刚创新高时Up为100，最高点在14根前则为0。数值不是涨跌百分比。','Black Up and blue-gray dashed Down measure how recently the 15-bar window (length 14) set its high and low: a fresh high makes Up 100, a high 14 bars ago makes it 0. Values are not returns.']};

Object.assign(EXTRA_READING,{
4:['黑线是20期SMMA（也叫RMA，Wilder平滑）：每根只用1/20的权重吸收新收盘，比同长度SMA更平缓、更慢；蓝灰虚线是SMA 20作对照。RSI和ATR内部用的就是这种平滑。','Black: 20-bar SMMA (also RMA, Wilder smoothing), absorbing each new close with weight 1/20, so it is smoother and slower than an SMA of equal length (blue-gray dashed). RSI and ATR use this smoothing internally.'],
6:['黑线是20期HMA：先用2×WMA(10)−WMA(20)抵消一部分滞后，再用WMA(4)平滑。它转向比蓝灰虚线SMA 20快得多，但在震荡段也更容易来回拐头。','Black: 20-bar HMA, built from 2 × WMA(10) − WMA(20) to offset lag, then smoothed by WMA(4). It turns much sooner than the blue-gray dashed SMA 20, and also flips more often in choppy stretches.'],
7:['黑线是DEMA 20 = 2×EMA−EMA(EMA)，蓝灰虚线是普通EMA 20。DEMA减掉了部分滞后，所以更贴近价格；名字里的“双”指算法用了两层EMA，不是把均线算两遍那么简单。','Black: DEMA 20 = 2 × EMA − EMA(EMA); blue-gray dashed: plain EMA 20. DEMA removes part of the lag and hugs price more closely. “Double” refers to the two EMA layers in the formula.'],
8:['黑线是TEMA 20 = 3×EMA1−3×EMA2+EMA3，蓝灰虚线是EMA 20。三层EMA让滞后更小，转折处几乎贴着K线，但也会更早被短暂波动带偏。','Black: TEMA 20 = 3 × EMA1 − 3 × EMA2 + EMA3; blue-gray dashed: EMA 20. Three layers reduce lag further, so it nearly tracks candles at turns, but brief swings also pull it off course sooner.'],
10:['五条EMA（10、20、30、40、50）组成均线带：短线在上、长线在下且彼此张开，表示近期价格一直高于较早价格；线束拧在一起表示方向不清。本图为了在120根模拟K线里完整显示而选了较短参数，平台默认值可能不同。','Five EMAs (10, 20, 30, 40, 50) form the ribbon. Short above long and fanning out means recent prices have stayed above older ones; a twisted bundle means no clear direction. Shorter lengths are used here to fit 120 synthetic bars; platform defaults may differ.'],
18:['副图PPO = (EMA12−EMA26)÷EMA26×100，和MACD同构但用百分比，柱是PPO与9期信号线之差。因为是百分比，不同价位的资产可以直接比较。','Below: PPO = (EMA12 − EMA26) ÷ EMA26 × 100, the same structure as MACD but in percent; bars are PPO minus its 9-bar signal. Being a percentage, it compares across assets with different price levels.'],
20:['主图黑线是EMA 13。副图Bull = 最高−EMA13，Bear = 最低−EMA13（Elder原版两条分开）；TradingView内置版把两者相加成一条。Bear在0上方说明这一根最低也高于EMA13。','Price panel: EMA 13. Below, Bull = high − EMA13 and Bear = low − EMA13 (Elder’s original, shown separately); TradingView’s built-in adds them into one line. Bear above zero means even the bar’s low sat above EMA13.'],
28:['副图NATR = ATR14÷收盘×100，把美元波幅换成百分比。价格水平不同的资产可以直接比较；它仍然只衡量波动大小，不指示方向。','Below: NATR = ATR14 ÷ close × 100, converting dollar range into a percentage, so assets at different price levels compare directly. It still measures volatility only, not direction.'],
30:['副图是最近20根收盘的总体标准差（与布林带同一算法），单位是美元。数值高表示收盘彼此分散，不代表价格在涨或跌。','Below: population standard deviation of the last 20 closes (the same calculation as Bollinger Bands), in USD. High values mean closes are spread out, not that price is rising or falling.'],
33:['副图RVOL = 当根成交量÷前20根平均量，1倍虚线是“和平时一样”。2倍表示这一小时成交是平常的两倍，颜色与方向无关。','Below: RVOL = this bar’s volume ÷ the average of the prior 20 bars; the dashed 1× line means “normal”. 2× means twice the usual hourly volume; it carries no direction.'],
35:['副图PVT按涨跌幅分配成交量：收盘涨1%就加上1%的成交量，跌则减。与OBV不同，小幅波动只贡献一小部分；绝对数取决于起算点，先看方向。','Below: PVT allocates volume by percentage change: a 1% higher close adds 1% of that bar’s volume, a lower close subtracts. Unlike OBV, small moves contribute little; the level depends on the start bar, so read direction first.'],
36:['副图PVO = (成交量EMA12−EMA26)÷EMA26×100，就是“成交量版PPO”。正值表示近期成交比较早时期活跃，与价格涨跌无关。','Below: PVO = (volume EMA12 − EMA26) ÷ EMA26 × 100, a “PPO of volume”. Positive values mean recent volume is busier than earlier volume, regardless of price direction.'],
44:['副图 = Aroon Up − Aroon Down，范围−100到100。正值表示最近15根里的最高点比最低点出现得更晚；它说的是时间先后，不是涨幅。','Below: Aroon Up − Aroon Down, from −100 to 100. Positive means the 15-bar high occurred more recently than the low; it is about timing, not size of moves.'],
45:['黑线VI+比较本根最高与前一根最低的距离，蓝灰虚线VI−比较本根最低与前一根最高，各自除以14根真实波幅之和。两线交叉只说明近14根哪一边的伸展更大。','Black VI+ compares this high with the prior low, blue-gray dashed VI− compares this low with the prior high, each divided by the 14-bar sum of true range. A cross only says which side stretched more over 14 bars.'],
46:['副图0—100，数值高表示近14根来回震荡、净移动小，数值低表示走得更直；38.2/61.8虚线是常见参考。它不说明方向。','The 0–100 panel: high values mean the last 14 bars chopped back and forth with little net travel; low values mean a straighter path. 38.2/61.8 are common references. It gives no direction.'],
52:['黑线LSMA 25是最近25根收盘做直线回归后，回归线在最新一根的位置；蓝灰虚线是SMA 20。它对直线趋势跟得很紧，但遇到拐点会冲过头。','Black: LSMA 25, the value at the latest bar of a straight-line regression through the last 25 closes; blue-gray dashed: SMA 20. It tracks straight trends closely but overshoots at turns.'],
57:['副图是“RSI的随机指标”：先算RSI 14，再看它在最近14个RSI读数区间中的位置，%K、%D各平滑3期。它比RSI敏感得多，经常贴着0或100。','Below: a Stochastic of RSI. RSI 14 is located within its own 14-reading range, then %K and %D are each smoothed over 3. It is far more sensitive than RSI and often pins at 0 or 100.'],
59:['副图CMO 9 = (上涨幅度和−下跌幅度和)÷两者之和×100，范围−100到100。与RSI用料相同，但不平滑、以0为中线；±50虚线是常见参考。','Below: CMO 9 = (sum of up moves − sum of down moves) ÷ their total × 100, from −100 to 100. Same inputs as RSI but unsmoothed and centred on zero; ±50 are common references.'],
60:['副图TSI把逐根价差先做25期、再做13期双重EMA平滑，再除以同样平滑后的绝对价差，蓝灰虚线是13期信号线。读数在−100到100之间，越过0表示平滑后的净变动转正。','Below: TSI double-smooths bar-to-bar changes (EMA 25 then 13) and divides by the same smoothing of absolute changes; blue-gray dashed is a 13-bar signal. Range −100 to 100; crossing zero means the smoothed net change turned positive.'],
61:['副图TRIX是收盘三重EMA 18的逐根百分比变化，蓝灰虚线是9期信号。三层平滑滤掉了大部分小波动，所以数值很小、转向很慢。部分平台用对数价格计算，读数会略有不同。','Below: TRIX is the bar-to-bar % change of a triple EMA 18 of closes, with a 9-bar signal (blue-gray dashed). Three layers filter most small swings, so values are tiny and turns slow. Some platforms use log prices, giving slightly different readings.'],
62:['副图UO把7、14、28三个窗口的“买压÷真实波幅”按4:2:1加权平均，范围0—100，30/70虚线是常见参考。多窗口是为了减少单一周期的假信号，并不消除滞后。','Below: UO averages buying pressure ÷ true range over 7, 14 and 28 bars with weights 4:2:1, from 0 to 100; 30/70 are common references. Multiple windows reduce single-period noise but do not remove lag.'],
63:['副图AO = 中价(高+低)/2的5期SMA − 34期SMA，用柱显示；绿柱表示在0上方，红柱在0下方（部分平台按“比前一根高或低”上色）。它是不带信号线的简化MACD。','Below: AO = SMA 5 − SMA 34 of the midpoint (high+low)/2, drawn as bars; green above zero, red below (some platforms colour by rising or falling versus the prior bar). It is a simplified MACD without a signal line.'],
77:['副图按收盘在当根高低区间的位置分配成交量：收在最高处加满全部量，收在最低处减去全部量，正中间不加不减，再逐根累计。注意它不看与前一根相比是否上涨。','Below: volume is allocated by where the close sits in the bar’s range: at the high it adds all volume, at the low it subtracts all, at the midpoint nothing, then accumulates. It ignores whether the close beat the prior bar.'],
78:['副图CMF = 最近20根(位置系数×成交量)之和÷成交量之和，范围−1到1。正值表示这20根大多收在各自区间的上半部分；它不是实际资金流入额。','Below: CMF = sum over 20 bars of (close-location factor × volume) ÷ sum of volume, from −1 to 1. Positive means most of those bars closed in the upper half of their range; it is not an actual money inflow.'],
79:['副图 = A/D线的3期EMA − 10期EMA，单位是股。它衡量A/D线最近的加速或减速；过0只说明短期A/D动量换了方向。','Below: EMA 3 − EMA 10 of the A/D line, in shares. It measures recent acceleration of A/D; a zero cross only means short-term A/D momentum changed direction.'],
81:['副图 = (本根收盘−前根收盘)×成交量，再做13期EMA。价差和成交量都大时读数才大；单位是美元×股，不同资产的绝对值不能直接比较。','Below: (close − prior close) × volume, smoothed by EMA 13. It is large only when both the price change and volume are large; units are USD × shares, so levels do not compare across assets.'],
85:['副图柱 = (收盘−开盘)÷(最高−最低)，范围−1到1；黑线是14期平均。1表示开在最低、收在最高。TradingView内置版默认不平滑，只显示柱。','Below: bars show (close − open) ÷ (high − low), from −1 to 1; the black line is a 14-bar average. 1 means it opened at the low and closed at the high. TradingView’s built-in shows unsmoothed values by default.'],
88:['副图先算每根收盘距最近14根最高收盘的回撤百分比，再取最近14个回撤的平方均值开方。只看下跌深度和持续时间，上涨不会推高它。','Below: each close’s % drawdown from the highest close of the last 14 bars, then the root-mean-square of the last 14 drawdowns. Only depth and duration of declines count; rallies do not raise it.'],
89:['黑线多头止损 = 最近22根最高价−3×ATR(22)，蓝灰虚线空头止损 = 最近22根最低价+3×ATR(22)。它们表示“离极值多远算回撤过大”，不是买卖点；部分版本用收盘最高/最低代替最高价/最低价。','Black long stop = 22-bar highest high − 3 × ATR(22); blue-gray dashed short stop = 22-bar lowest low + 3 × ATR(22). They mark how far from an extreme a pullback becomes large, not entries; some versions use highest/lowest close instead.']});

Object.assign(EXTRA_READING,{
31:['副图是最近20根对数收益率的标准差，按一年 24×365 小时折算成年化百分比（适用于全天交易的市场；股票通常按252个交易日折算，数字会不同）。它只描述过去波动有多大。','Below: standard deviation of the last 20 log returns, annualised with 24 × 365 hours (suits round-the-clock markets; equities usually use 252 trading days, giving different numbers). It only describes how large past swings were.'],
40:['副图是本资产收盘除以另一组模拟基准的收盘，蓝灰虚线是比值的20期均线。比值上升表示本资产跑赢基准，即使两者都在下跌也可以如此；基准是第二组模拟数据，没有画在主图上。','Below: this asset’s close divided by a second synthetic benchmark’s close, with a 20-bar average (blue-gray dashed). A rising ratio means outperforming the benchmark, which can happen even while both fall. The benchmark is separate synthetic data not drawn above.'],
47:['黑线转换线是9根最高最低的中点，蓝灰虚线基准线是26根的中点；两条灰线是先行带A、B，算好后向右平移26根，所以图中“云”的位置来自26根之前；点线迟行线是收盘向左平移26根，所以最右侧26根没有迟行线。','Black Tenkan: midpoint of the 9-bar high/low; blue-gray dashed Kijun: 26-bar midpoint. The gray Span A and B are plotted 26 bars forward, so today’s cloud was computed 26 bars ago. The dotted Chikou is the close shifted 26 bars back, so it is absent from the last 26 bars.'],
48:['三条线都是中价(高+低)/2的平滑均线并向右平移：颚13期移8根，齿8期移5根，唇5期移3根。三线缠绕表示没有方向，按唇、齿、颚顺序张开表示一段持续走势；平移意味着线条本身已经滞后。','All three lines are smoothed averages of the median price shifted right: Jaw 13 shifted 8, Teeth 8 shifted 5, Lips 5 shifted 3. Intertwined lines mean no direction; fanning out in Lips–Teeth–Jaw order means a sustained move. The shift itself adds lag.'],
49:['黑线KAMA按“效率比”调速：10根内净移动占总路程的比例越高，它跟得越快（最快接近EMA 2）；来回震荡时几乎不动（最慢接近EMA 30）。蓝灰虚线SMA 20作对照。','Black KAMA adjusts speed by the efficiency ratio: the larger the 10-bar net move relative to total path, the faster it follows (up to EMA 2 speed); in back-and-forth chop it nearly stalls (EMA 30 speed). Blue-gray dashed SMA 20 for comparison.'],
50:['黑线ALMA 9用高斯权重：偏移0.85把权重峰值放在窗口靠近最新的一侧，σ=6控制峰的宽窄。它比同长度SMA更平滑、滞后更少，但参数一改形状就变。','Black ALMA 9 uses Gaussian weights: offset 0.85 puts the peak near the newest bars and sigma 6 sets its width. It is smoother and less lagging than an equal-length SMA, but its shape changes with the parameters.'],
51:['黑线McGinley Dynamic会根据价格与自身的距离自动调速：价格跑在线下方时它下移得快，在上方时追得慢一些，以减少被拉开的情况。蓝灰虚线EMA 20作对照。本例用TradingView公式，以EMA 14作起点。','Black McGinley Dynamic adjusts its speed by the gap between price and itself: it moves down faster when price is below and follows up more cautiously when above, reducing separation. Blue-gray dashed EMA 20 for comparison. Uses the TradingView formula seeded with EMA 14.'],
53:['黑线是对本图48根收盘做的最小二乘直线，上下虚线是残差标准差的±2倍。注意：整条通道依赖所选窗口，新K线出现后整条线都会重画，所以它描述的是过去这一段的斜率与离散程度。','Black: least-squares line through the 48 displayed closes; dashed lines at ± 2 residual standard deviations. The whole channel depends on the chosen window and redraws with every new bar, so it describes slope and dispersion of this past stretch.'],
54:['副图是最近14根收盘直线回归的斜率，单位是“美元/每根K线”。0以上表示这14根整体向上倾斜；数值大小与价格水平有关，不同资产不能直接比较。','Below: slope of a straight-line regression through the last 14 closes, in USD per bar. Above zero means the 14 bars tilt upward; magnitude depends on price level, so it does not compare across assets.'],
55:['副图R²表示最近14根收盘有多贴近一条直线：1是完全在线上，0是看不出直线关系。R²高只说明走得直，方向要看斜率；它不预测趋势会否延续。','Below: R² shows how closely the last 14 closes fit a straight line: 1 is perfectly linear, 0 shows no linear relation. High R² only means a straight path; direction comes from the slope. It does not predict continuation.'],
56:['副图是本资产与模拟基准最近20根收盘价的皮尔逊相关系数，范围−1到1。接近1表示两者同涨同跌，接近−1表示相反；这里用的是价格而非收益率，两条都有趋势时数值容易偏高。','Below: Pearson correlation of the last 20 closes of this asset and the synthetic benchmark, from −1 to 1. Near 1 they move together, near −1 opposite. It uses prices rather than returns, so two trending series can show inflated values.'],
64:['副图SMI比较收盘与最近10根高低区间中点的距离，经两次3期EMA平滑后再除以区间宽度一半，±40虚线是常见参考。与普通随机指标不同，它以0为中线，范围约−100到100。','Below: SMI measures the close’s distance from the midpoint of the 10-bar range, double-smoothed with EMA 3 and divided by half the range; ±40 are common references. Unlike the Stochastic, it centres on zero with a range of about −100 to 100.'],
65:['副图是TSI的比值形式（先20期、再5期EMA平滑），蓝灰虚线是5期信号线，读数在−1到1之间。它与TSI同源，只是参数更短、不乘100。','Below: the TSI ratio (smoothed by EMA 20 then 5) with a 5-bar signal (blue-gray dashed), ranging from −1 to 1. Same idea as TSI, with shorter settings and no ×100 scaling.'],
66:['副图RVI比较“收盘−开盘”与“最高−最低”：先用1-2-2-1权重平滑，再各取10根之和相除；蓝灰虚线是同样加权的信号线。正值表示近期K线多数收在开盘之上。','Below: RVI compares close − open with high − low, each smoothed with 1-2-2-1 weights and summed over 10 bars before dividing; the blue-gray dashed signal uses the same weights. Positive means recent bars mostly closed above their opens.'],
67:['副图形式像RSI，但累计的不是涨跌幅，而是10根收盘的标准差：收盘上涨的那根计入“上”，下跌计入“下”，各做14期EMA。50以上表示近期波动更多出现在上涨的K线上。','Below: shaped like RSI, but it accumulates the 10-bar standard deviation instead of price change: assigned to “up” on higher closes and “down” otherwise, each smoothed by EMA 14. Above 50 means recent volatility occurred mostly on up bars.'],
68:['副图RCI是最近9根“时间顺序”与“价格排名”的斯皮尔曼等级相关，×100后范围−100到100。100表示9根收盘一根比一根高；只看排名，不看涨了多少。','Below: RCI is the Spearman rank correlation between time order and price rank over 9 bars, ×100, from −100 to 100. 100 means each close was higher than the one before; it uses ranks only, not the size of moves.'],
69:['副图先把中价在最近9根区间中的位置换算到−1到1，再做费舍尔变换，使极端值被放大、转折更醒目；蓝灰虚线是前一根的读数。它没有固定上下限，尖峰只说明位置极端。','Below: the median price’s position in the 9-bar range is mapped to −1…1, then Fisher-transformed so extremes are amplified and turns stand out; blue-gray dashed is the previous bar’s value. It has no fixed bounds; spikes only mean an extreme position.'],
70:['副图DPO = 收盘 − 11根之前的21期均线。它刻意把均线往回移，去掉长期趋势，只留下短周期起伏，用来看波段间隔，不适合判断方向。部分平台默认“居中”画法，数值会错位。','Below: DPO = close − the SMA 21 from 11 bars earlier. Shifting the average back removes the longer trend and leaves short cycles for spacing swings, not for direction. Some platforms default to a centred version, so values shift.'],
71:['副图KST把ROC 10/15/20/30各自平滑后按1:2:3:4加权相加，蓝灰虚线是9期信号线。原版设计用于日线以上周期，本图把同样参数用在小时K线上，只用于演示读法。','Below: KST adds smoothed ROC 10/15/20/30 with weights 1:2:3:4; blue-gray dashed is a 9-bar signal. The original targets daily or longer charts; the same settings on hourly bars here only demonstrate how to read it.'],
73:['副图PMO把每根百分比涨跌先做35期、再做20期的自定义平滑（系数2/n，放大10倍），蓝灰虚线是10期EMA信号。不同平台的起始平滑值不同，前段读数会有差异。','Below: PMO smooths each bar’s % change with a custom 2/n factor over 35 then 20 bars (×10); blue-gray dashed is a 10-bar EMA signal. Platforms seed the smoothing differently, so early values differ.'],
74:['副图Coppock = (ROC 14 + ROC 11) 的10期加权均线。它原本为月线设计、用来观察大级别底部，本图套用在小时K线上，只示范它的计算与读法。','Below: Coppock = WMA 10 of (ROC 14 + ROC 11). It was designed for monthly charts to study major bottoms; applying it to hourly bars here only shows the calculation and reading.'],
75:['副图MACD-V = (EMA12−EMA26) ÷ ATR26 × 100，用波动把MACD标准化，不同价格和波动的资产可以比较；±50虚线是作者常用参考，柱是与9期信号线的差。','Below: MACD-V = (EMA12 − EMA26) ÷ ATR26 × 100, normalising MACD by volatility so assets with different prices and volatility compare; ±50 are the author’s usual references, and bars show the gap to a 9-bar signal.'],
76:['副图Mass Index是(最高−最低)的EMA9与其二次EMA9之比，累加25根，读数通常在25附近。原作者关注的是升破27后再回落到26.5以下，这表示波幅曾经扩张后收缩，并不说明方向。','Below: the ratio of EMA 9 of (high − low) to its double EMA 9, summed over 25 bars, usually near 25. The original focus is a rise above 27 followed by a drop below 26.5: range expanded then contracted, with no direction implied.'],
80:['副图按典型价比前一根升或降，给成交量加上正号或负号，再取EMA34−EMA55，蓝灰虚线是13期信号线。这是TradingView内置的简化公式，克林格原版还考虑了趋势与累计波幅，数值不同。','Below: volume is signed by whether typical price rose or fell versus the prior bar, then EMA34 − EMA55, with a 13-bar signal (blue-gray dashed). This is TradingView’s simplified built-in; Klinger’s original also uses trend and cumulative range, giving different numbers.'],
82:['副图EOM =（中价变化 × 高低幅度 ÷ 成交量）× 10000，再取14期平均。正值大表示用较少成交量就推高了价格；分母的10000只是缩放，换平台可能不同。','Below: EOM = (change in median price × range ÷ volume) × 10 000, averaged over 14 bars. Large positive values mean price rose on relatively light volume; the 10 000 divisor is only scaling and differs by platform.'],
83:['副图PVI只在成交量比前一根大的K线上更新：按当根涨跌幅变化，量缩的K线保持不变。它关注放量时价格怎么走；起点1000只是约定，先看方向。','Below: PVI updates only on bars with higher volume than the prior bar, changing by that bar’s % move; lower-volume bars leave it unchanged. It tracks how price behaves on rising volume. The 1000 start is convention; read direction first.'],
84:['副图NVI与PVI相反，只在成交量比前一根小的K线上按涨跌幅更新。传统解读认为量缩时的走势更能反映耐心资金的动向，但这只是一种观点。起点1000只是约定。','Below: NVI mirrors PVI, updating only on bars with lower volume than the prior bar. The traditional view holds that moves on falling volume reveal patient money, which is an interpretation, not a fact. The 1000 start is convention.'],
86:['副图柱 = 当根成交量 ÷ 前3天同一UTC小时的平均成交量，1倍虚线表示“和这个时段平时一样”。它比普通RVOL更公平，因为开盘、午间等时段本来量就不同；本例模拟数据没有设计日内规律。','Below: this bar’s volume ÷ the average volume at the same UTC hour over the previous 3 days; the 1× line means normal for that hour. It is fairer than plain RVOL because some hours are naturally busier; this synthetic data has no built-in intraday pattern.'],
87:['主图虚线是布林带(20, 2σ)，点线是肯特纳通道(20, 1.5×平均真实波幅)。副图0线上的红点表示布林带完全在肯特纳通道之内（挤压中），绿点表示未挤压；柱是收盘相对区间中线的线性回归动量。挤压只说明波动收窄，不说明往哪边突破。','Price panel: dashed Bollinger Bands (20, 2σ) and dotted Keltner Channel (20, 1.5 × average true range). Red dots on the zero line mark Bollinger Bands fully inside Keltner (squeeze on); green dots mark squeeze off. Bars show regression momentum of the close relative to the range midpoint. A squeeze only says volatility narrowed, not which way it will break.'],
90:['黑线多头止损：先算“10根最低+1×ATR10”，再取最近9个值中的最低；蓝灰虚线空头止损：“10根最高−1×ATR10”再取9个中的最高。两步计算让线更平稳，不是进出场信号。','Black long stop: lowest of the last 9 values of (10-bar low + 1 × ATR10); blue-gray dashed short stop: highest of the last 9 values of (10-bar high − 1 × ATR10). The two steps make the lines steadier; they are not entry or exit signals.'],
91:['黑实线在价格下方表示向上跟踪：止损 = 期间最高收盘 − 3×ATR14，只上移不下移；收盘跌破后换到上方，变成蓝灰虚线向下跟踪。倍数越小越贴近价格、越容易被短暂波动触发。','Black solid line below price tracks up: stop = highest close since the flip − 3 × ATR14, moving only upward. A close below it flips the stop above price (blue-gray dashed, tracking down). Smaller multiples sit closer and trigger more easily on brief swings.'],
92:['与ATR跟踪止损同一套规则（TradingView“Volatility Stop”），参数改为ATR20×2：止损更贴近、换边更频繁。比较本页与ATR跟踪止损页，可以直接看到参数怎样改变触发次数。','Same rules as the ATR trailing stop (TradingView “Volatility Stop”), with ATR20 × 2: the stop sits closer and flips more often. Comparing this page with the ATR trailing stop page shows how parameters change the number of triggers.'],
93:['黑线从本窗口最低价那一根开始，把每根典型价×成交量累计，除以累计成交量。它表示“从这个锚点以来所有成交的平均价”；换一个锚点，线就完全不同，所以锚点要有理由（事件、转折点）。','The black line starts at the lowest-low bar of this window and accumulates typical price × volume divided by cumulative volume. It is the average price of all trades since that anchor; a different anchor gives a different line, so the anchor needs a reason (an event or turning point).'],
94:['每个UTC日的线由前一天的最高、最低、收盘算出：P=(H+L+C)÷3，R1=2P−L，S1=2P−H，R2=P+(H−L)，S2=P−(H−L)。图中只画P、R1、S1（R2、S2离价格较远，未画出）。线在一天之内是水平的，换日时跳到新位置；时区或交易时段不同，线就不同。','Each UTC day’s lines come from the prior day’s high, low and close: P = (H+L+C)/3, R1 = 2P − L, S1 = 2P − H, R2 = P + (H − L), S2 = P − (H − L). Only P, R1 and S1 are drawn (R2 and S2 lie far from price here). Lines stay flat within a day and jump at the day change; a different time zone or session gives different lines.'],
95:['红点标在左右各5根都没有更高最高价的K线上方（枢轴高点），绿点标在左右各5根都没有更低最低价的K线下方。需要等右边5根走完才能确认，所以标记总比实际高低点晚出现。','Red dots sit above bars whose high is not exceeded by 5 bars on either side (pivot highs); green dots below bars whose low is not undercut by 5 bars on either side. Confirmation needs the 5 bars to the right, so marks always appear after the fact.'],
96:['从本窗口的最低点和最高点量出比例线：0%和100%是这两个点本身，中间是23.6%、38.2%、50%、61.8%、78.6%。这些比例来自数学数列，价格在附近停顿并不能证明比例本身有作用；起止点选得不同，线就不同。','Ratio lines measured between this window’s lowest low and highest high: 0% and 100% are those points, with 23.6%, 38.2%, 50%, 61.8% and 78.6% in between. The ratios come from a number sequence; price pausing nearby does not prove they cause anything, and different anchor points give different lines.'],
97:['威廉分形是5根K线的形态：中间一根的最高价高于左右各2根就是向上分形（红点），最低价低于左右各2根就是向下分形（绿点）。右边2根走完才确认，所以最右侧2根不会有标记。','A Williams fractal is a 5-bar pattern: a middle bar whose high exceeds the 2 bars on each side is an up fractal (red dot); one whose low undercuts them is a down fractal (green dot). Confirmation needs the 2 bars to the right, so the last 2 bars carry no marks.'],
98:['黑线把幅度超过1.5%的高低点连起来，过滤掉小波动。最后一段是“暂定”的：价格再创新高或新低时，最后一个转折点会被移动，所以ZigZag不能当作实时信号，只适合事后标记结构。','The black line connects highs and lows separated by more than 1.5%, filtering out smaller swings. The last leg is provisional: a new extreme moves the last turning point, so ZigZag is not a real-time signal, only a way to mark structure after the fact.']});
