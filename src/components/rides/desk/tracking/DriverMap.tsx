import { useEffect,useRef,useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './driver-map.css';
import type {MapCar,MapPin} from './types';
export function DriverMap({cars,pins=[],now=Date.now()}:{cars:MapCar[];pins?:MapPin[];now?:number}){
 const root=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layer=useRef<L.LayerGroup|null>(null);const [failed,setFailed]=useState(false);
 useEffect(()=>{if(!root.current)return;const m=L.map(root.current,{scrollWheelZoom:false}).setView([39.08,-94.58],12);map.current=m;layer.current=L.layerGroup().addTo(m);
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19,referrerPolicy:'no-referrer'});tiles.on('tileerror',()=>setFailed(true));tiles.addTo(m);
 const resize=new ResizeObserver(()=>m.invalidateSize());resize.observe(root.current);return()=>{resize.disconnect();m.remove();map.current=null;layer.current=null;};},[]);
 useEffect(()=>{const l=layer.current;if(!l)return;l.clearLayers();const style=getComputedStyle(document.documentElement);const color=(name:string)=>`hsl(${style.getPropertyValue(name).trim()})`;
 for(const c of cars){const age=Math.max(0,Math.floor((now-Date.parse(c.updatedAt))/1000)),stale=age>120;const stroke=color(stale?'--muted-foreground':c.source==='autocab'?'--rides-blue':'--rides-green');
 if(c.trail.length>1)L.polyline(c.trail.map(p=>[p.lat,p.lng] as [number,number]),{color:stroke,weight:3,opacity:0.6}).addTo(l);
 const text=document.createElement('span');text.textContent=`${c.label}. ${stale?'No update':`${age} sec ago`}`;L.circleMarker([c.lat,c.lng],{radius:9,color:stroke,fillColor:stroke,fillOpacity:0.85,weight:3}).addTo(l).bindTooltip(text,{permanent:cars.length===1&&pins.length===0,direction:'top',className:'driver-map-label'});
 }
 for(const p of pins){const text=document.createElement('span');text.textContent=p.label;L.circleMarker([p.lat,p.lng],{radius:7,color:color('--rides-amber'),weight:3,fillOpacity:0.3}).addTo(l).bindTooltip(text,{direction:'bottom',className:'driver-map-label'});}
 },[cars,pins,now]);
 return <div className="min-w-0 space-y-3"><div ref={root} className={`driver-map h-72 w-full rounded-lg border border-border ${failed?'hidden':''}`} role="region" aria-label="Coordinator car location map"/>{failed&&<p role="status" className="text-sm text-muted-foreground">Map tiles are unavailable. Car locations are listed below.</p>}<ul className="space-y-2 text-sm" aria-label="Car updates">{cars.map(c=>{const age=Math.max(0,Math.floor((now-Date.parse(c.updatedAt))/1000));return <li key={c.id} className="flex flex-wrap justify-between gap-2"><b>{c.label}</b><span className={age>120?'text-muted-foreground':'text-primary'}>{age>120?'No update. ':''}{age<60?`${age} sec ago`:`${Math.floor(age/60)} min ago`}</span>{failed&&<span className="w-full break-words text-muted-foreground">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}. {new Date(c.updatedAt).toLocaleTimeString('en-US',{timeZone:'America/Chicago'})} Central</span>}</li>;})}{pins.map(p=><li key={p.label} className="text-sm text-muted-foreground">{p.label}{failed?`: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`:''}</li>)}{cars.length===0&&<li className="text-muted-foreground">No car location yet.</li>}</ul></div>;
}
