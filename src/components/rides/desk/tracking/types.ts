export type DriverPoint={lat:number;lng:number;accuracy_m:number;heading?:number|null;speed_mps?:number|null;recorded_at:string;received_at:string};
export type DriverSession={id:string;label:string;service_date:string;created_at:string;expires_at:string;consented_at:string|null;last_seen_at:string|null;stopped_at:string|null;revoked_at:string|null;latest:DriverPoint|null;trail:DriverPoint[];age_seconds:number|null};
export type MapCar={id:string;label:string;source:'share'|'autocab';lat:number;lng:number;updatedAt:string;trail:{lat:number;lng:number}[]};
export type MapPin={lat:number;lng:number;label:string};
