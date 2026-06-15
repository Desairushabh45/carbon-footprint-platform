interface Window {
    AppConfig: any;
    IS_DEVELOPMENT: boolean;
    ERROR_CATALOG: any;
    cloudLogger: any;
    logToBigQuery: (data: any) => Promise<void>;
    google: any;
    firebase: any;
    gtag: (...args: any[]) => void;
    jspdf: any;
}

interface ExtendableEvent extends Event {
    waitUntil(fn: Promise<any>): void;
}

interface FetchEvent extends Event {
    request: Request;
}

declare var AppConfig: any;
declare var cloudLogger: any;
declare var google: any;
declare var firebase: any;
declare var gtag: (...args: any[]) => void;
declare var jspdf: any;

