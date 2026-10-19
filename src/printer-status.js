export const AGENT_OFFLINE_AFTER_MS=30000;
export function printerConnection(shop,now=Date.now()){
  if(!shop)return {agent:'Loading',printer:'Loading',online:false};
  if(shop.enabled===false)return {agent:'Disabled',printer:'Disabled',online:false};
  const lastSeen=new Date(shop.agentLastSeenAt||0).getTime();
  const online=Number.isFinite(lastSeen)&&lastSeen>0&&now-lastSeen<=AGENT_OFFLINE_AFTER_MS;
  return {agent:online?'Online':'Offline',printer:!online?'Offline':shop.agentPrinterStatus==='online'?'Online':shop.agentPrinterStatus==='offline'?'Offline':'Unknown',online};
}
