export enum TokenState {
    CREATED = 'CREATED',
    WAITING = 'WAITING',
    NEAR = 'NEAR',
    CONFIRMING = 'CONFIRMING',
    CONFIRMED = 'CONFIRMED',
    CALLED = 'CALLED',
    SERVING = 'SERVING',
    DONE = 'DONE',
    MISSED = 'MISSED',
    EXPIRED = 'EXPIRED'
}

export interface Service {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    presence_radius: number;
    status: 'OPEN' | 'CLOSED';
}

export interface Token {
    id: string;
    service_id: string;
    user_identifier: string; // We'll store this in localStorage
    token_number: number;
    state: TokenState;
    entry_qr_code?: string;
    exit_qr_code?: string;
}
