import { Algos } from './manager';
import { Tier } from './salter';

export interface KeyState {
    vn: [number, number];
    i: string;
    s: string;
    p?: string;
    d: string;
    f: string;
    dt: string;
    et: string;
    kt: string | string[];
    k: string[];
    nt: string | string[];
    n: string[];
    bt: string;
    b: string[];
    c: string[];
    ee: EstablishmentState;
    di?: string;
}

export interface EstablishmentState {
    d: string;
    s: string;
}

/**
 * Marker interface for state configuring an IdentifierManager.
 */
export interface IdentifierManagerState {}

/**
 * Interface defining configuration parameters for a SaltyIdentifierManager
 */
export interface SaltyState extends IdentifierManagerState {
    /**
     * Encrypted
     */
    sxlt: string;
    pidx: number;
    kidx: number;
    stem: string;
    tier: Tier;
    dcode: string;
    icodes: string[];
    ncodes: string[];
    transferable: boolean;
}

export interface RandyState extends IdentifierManagerState {
    prxs: string[];
    nxts: string[];
}

export interface GroupState extends IdentifierManagerState {
    mhab: HabState;
    keys: string[];
    ndigs: string[];
}

export interface ExternState extends IdentifierManagerState {
    extern_type: string;
    pidx: number;
    [key: string]: unknown;
}

export interface HabState {
    name: string;
    prefix: string;
    transferable: boolean;
    state: KeyState;
    windexes: unknown[];
    icp_dt: string;
    [Algos.salty]?: SaltyState;
    [Algos.randy]?: RandyState;
    [Algos.group]?: GroupState;
    [Algos.extern]?: ExternState;
}
