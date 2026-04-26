// ============================================
// BPB PANEL - COMPLETE TYPES FILE
// Merged: Xray Types + Sing-box Types + Global Types + Clash Types
// Version: 4.1.3
// ============================================

// ===== PART 1: XRAY TYPES =====

export type DnsHosts = Record<string, string[] | string>
export type DomainStrategy = "UseIP" | "UseIPv4" | "UseIPv4v6";
export type TransportType = "tcp" | "raw" | "ws" | "httpupgrade" | "grpc";
export type Protocol =
    | "http"
    | "socks"
    | "shadowsocks"
    | "vless"
    | "trojan"
    | "vmess"
    | "wireguard"
    | "dns"
    | "freedom"
    | "blackhole";

export type Fingerprint =
    | "chrome"
    | "firefox"
    | "safari"
    | "ios"
    | "android"
    | "edge"
    | "360"
    | "qq"
    | "random"
    | "randomized";

export type DnsServer = {
    address: string;
    domains?: string[];
    expectIPs?: string[];
    skipFallback?: boolean;
    finalQuery?: boolean;
    tag?: string;
} | "fakedns";

export interface DNS {
    hosts?: DnsHosts;
    servers: Array<"fakedns" | DnsServer>;
    queryStrategy: DomainStrategy;
    tag: "dns";
}

export interface MixedInbound {
    listen: string;
    port: 10808;
    protocol: "socks" | "mixed";
    settings: {
        auth: "noauth";
        udp: true;
    };
    sniffing: {
        destOverride: Array<"http" | "tls" | "quic" | "fakedns">;
        enabled: true;
        routeOnly: true;
    };
    tag: "mixed-in";
}

export interface DokodemoDoorInbound {
    listen: string;
    port: 10853;
    protocol: "dokodemo-door";
    settings: {
        address: "1.1.1.1";
        network: "tcp,udp";
        port: 53;
    };
    tag: "dns-in";
}

export interface RoutingRule {
    inboundTag?: string[];
    domain?: string[];
    ip?: string[];
    port?: number | string;
    network?: "tcp" | "udp" | "tcp,udp";
    protocol?: Array<"http" | "tls" | "bittorrent" | "quic">;
    outboundTag?: string;
    balancerTag?: string
    type: "field";
}

export interface Balancer {
    tag: string;
    selector: string[];
    fallbackTag?: string;
    strategy: {
        type: "leastPing";
    };
}

interface Routing {
    domainStrategy: "IPIfNonMatch";
    rules: RoutingRule[];
    balancers?: Balancer[];
}

export interface Observatory {
    subjectSelector: string[];
    probeUrl: string;
    probeInterval: string;
    enableConcurrency: true;
}

interface Mux {
    enabled: true;
    concurrency: 8;
    xudpConcurrency: 16;
    xudpProxyUDP443: "reject";
}

export interface TlsSettings {
    serverName: string;
    fingerprint: Fingerprint;
    alpn?: string[];
    allowInsecure: boolean;
    echConfigList?: string;
}

export interface RealitySettings {
    serverName: string;
    publicKey: string;
    shortId: string;
    spiderX: string;
    fingerprint: Fingerprint;
    allowInsecure: false;
    show: false;
}

export interface TcpHeader {
    type: "http" | "none";
    request?: {
        headers: {
            "Host"?: string[];
            "Accept-Encoding": ["gzip, deflate"];
            "Connection": ["keep-alive"];
            "Pragma": "no-cache";
        };
        method: "GET";
        path: string[];
        version: "1.1";
    };
}

export interface RawSettings {
    header: TcpHeader;
}

export interface WsSettings {
    host?: string;
    path: string;
}

export interface HttpupgradeSettings {
    host?: string;
    path: string;
}

export interface GrpcSettings {
    authority?: string;
    multiMode?: boolean;
    serviceName?: string;
}

export type Transport =
    | RawSettings
    | WsSettings
    | HttpupgradeSettings
    | GrpcSettings;

export interface HappyEyeballs {
    tryDelayMs: number;
    prioritizeIPv6: boolean;
    interleave: number;
    maxConcurrentTry: number;
}

export interface Sockopt {
    dialerProxy?: string;
    domainStrategy?: DomainStrategy;
    tcpFastOpen?: boolean;
    happyEyeballs?: HappyEyeballs;
}

export interface StreamSettings {
    network?: TransportType;
    security?: "none" | "tls" | "reality";
    tlsSettings?: TlsSettings;
    realitySettings?: RealitySettings;
    rawSettings?: RawSettings;
    wsSettings?: WsSettings;
    httpupgradeSettings?: HttpupgradeSettings;
    grpcSettings?: GrpcSettings;
    sockopt: Sockopt;
}

interface BlockholeSettings {
    response: {
        type: "http";
    };
}

interface DnsOutSettings {
    nonIPQuery: "reject";
}

interface Fragment {
    packets: "tlshello" | "1-1" | "1-2" | "1-3" | "1-5";
    length: string;
    interval: string;
    maxSplit?: string;
}

export interface Noise {
    type: 'rand' | 'base64' | 'hex' | 'str';
    packet: string;
    delay: string;
}

export interface FreedomSettings {
    fragment?: Fragment;
    noises?: Noise[];
    domainStrategy?: DomainStrategy;
}

export interface HttpSocksSettings {
    servers: [{
        address: string;
        port: number;
        users: [{
            user: string;
            pass: string;
        }];
    }];
}

export interface ShadowsocksSettings {
    servers: [{
        address: string;
        port: number;
        method: string;
        password: string;
    }];
}

export interface VlessSettings {
    vnext: [{
        address: string;
        port: number;
        users: [{
            id: string;
            flow?: "xtls-rprx-vision";
            encryption: "none";
        }];
    }]
}

export interface VmessSettings {
    vnext: [{
        address: string;
        port: number;
        users: [{
            id: string;
            security: "auto";
        }];
    }];
}

export interface TrojanSettings {
    servers: [{
        address: string;
        port: number;
        password: string;
    }];
}

export interface WireguardSettings {
    address: string[];
    mtu: 1280;
    peers: [{
        endpoint: string;
        publicKey: string;
        keepAlive: number;
    }];
    reserved: number[];
    secretKey: string;
    wnoise?: string;
    wnoisecount?: string;
    wpayloadsize?: string;
    wnoisedelay?: string;
}

type OutboundSettings =
    | DnsOutSettings
    | BlockholeSettings
    | FreedomSettings
    | HttpSocksSettings
    | ShadowsocksSettings
    | VlessSettings
    | VmessSettings
    | TrojanSettings
    | WireguardSettings;

export interface Outbound {
    protocol: Protocol;
    mux?: Mux;
    settings: OutboundSettings;
    streamSettings?: StreamSettings;
    tag: string;
}

interface Log {
    loglevel: "none" | "warning" | "error" | "info" | "debug";
}

interface Policy {
    levels: Record<number, {
        connIdle: number;
        handshake: number;
        uplinkOnly: number;
        downlinkOnly: number;
    }>;
    system: {
        statsOutboundUplink: true;
        statsOutboundDownlink: true;
    };
}

export interface Config {
    remarks: string;
    version: {
        min: string;
        max?: string;
    };
    log: Log;
    dns: DNS;
    inbounds: Array<MixedInbound | DokodemoDoorInbound>;
    outbounds: Outbound[];
    policy: Policy;
    routing: Routing,
    observatory?: Observatory;
    stats: {};
}

// ===== PART 2: SING-BOX TYPES =====

export type ResolveStrategy = "ipv4_only" | "prefer_ipv4";
export type ProtocolSB =
    | "http"
    | "socks"
    | "shadowsocks"
    | "vless"
    | "trojan"
    | "vmess"
    | "wireguard"
    | "selector"
    | "urltest"
    | "direct";

export interface DnsServerSB {
    type: string;
    server?: string;
    predefined?: Record<string, string[] | undefined>;
    inet4_range?: string;
    inet6_range?: string;
    detour?: string;
    domain_resolver?: {
        server: string;
        strategy: ResolveStrategy;
    };
    tag: string;
}

export interface DnsRule {
    type?: "logical";
    clash_mode?: "Global" | "Direct";
    mode?: "and";
    rules?: { rule_set: string | string[]; }[];
    rule_set?: string[] | string;
    domain?: string[];
    domain_suffix?: string[];
    ip_accept_any?: true;
    inbound?: string;
    query_type?: Array<"A" | "AAAA" | "HTTPS">;
    action?: "route" | "reject";
    server?: string;
}

export interface DNSSB {
    servers: DnsServerSB[];
    rules: DnsRule[];
    strategy: ResolveStrategy;
    independent_cache: true;
}

export interface TunInbound {
    type: "tun";
    tag: "tun-in";
    address: string[];
    mtu: 9000;
    auto_route: true;
    strict_route: true;
    stack: "mixed";
}

export interface MixedInboundSB {
    type: "mixed";
    tag: "mixed-in";
    listen: string;
    listen_port: 2080;
}

export interface RoutingRuleSB {
    rule_set?: string[];
    domain_suffix?: string[];
    ip_cidr?: string[] | string;
    ip_is_private?: true;
    network?: "tcp" | "udp";
    protocol?: "http" | "tls" | "quic" | "dns";
    port?: number;
    clash_mode?: "Global" | "Direct";
    action?: "route" | "reject" | "hijack-dns" | "sniff";
    outbound?: string;
}

export interface RuleSet {
    type: "remote";
    tag: string;
    format: "binary";
    url: string;
    download_detour: string;
}

export interface Route {
    rules: RoutingRuleSB[];
    rule_set?: RuleSet[];
    auto_detect_interface: true;
    default_domain_resolver: {
        server: string;
        strategy: ResolveStrategy;
        rewrite_ttl: number;
    };
    final: string;
}

export interface TLSSB {
    enabled: true;
    server_name: string;
    record_fragment?: boolean;
    insecure: boolean;
    alpn?: string[];
    utls: {
        enabled: boolean;
        fingerprint?: Fingerprint;
    };
    reality?: {
        enabled: true;
        public_key: string;
        short_id: string;
    };
    ech?: {
        enabled: boolean;
        query_server_name?: string;
    };
}

export interface HttpTransport {
    type: "http";
    host?: string[];
    path: string;
    method: "GET";
    headers: Record<string, string[]>
}

export interface WsTransport {
    type: "ws";
    path: string;
    headers?: {
        Host?: string;
    };
    max_early_data?: number;
    early_data_header_name?: "Sec-WebSocket-Protocol";
}

export interface HttpupgradeTransport {
    type: "httpupgrade";
    host?: string;
    path: string;
}

export interface GrpcTransport {
    type: "grpc";
    service_name?: string;
}

export type TransportSB =
    | HttpTransport
    | WsTransport
    | HttpupgradeTransport
    | GrpcTransport;

export interface BaseOutboundSB {
    tag: string;
    type: ProtocolSB;
    server?: string;
    server_port?: number;
    tcp_fast_open?: boolean;
    detour?: string;
}

export interface SocksOutboundSB extends BaseOutboundSB {
    username?: string;
    password?: string;
    version: "5";
    network: "tcp";
}

export interface HttpOutboundSB extends BaseOutboundSB {
    username?: string;
    password?: string;
}

export interface ShadowsocksOutboundSB extends BaseOutboundSB {
    password: string;
    method: string;
    network: "tcp";
}

export interface TrojanOutboundSB extends BaseOutboundSB {
    password: string;
    network: "tcp";
    tls?: TLSSB;
    transport?: TransportSB
}

export interface VlessOutboundSB extends BaseOutboundSB {
    uuid: string;
    flow?: "xtls-rprx-vision";
    packet_encoding?: "";
    network: "tcp";
    tls?: TLSSB;
    transport?: TransportSB
}

export interface VmessOutboundSB extends BaseOutboundSB {
    uuid: string;
    security: "auto";
    alter_id: number;
    packet_encoding?: "";
    network: "tcp";
    tls?: TLSSB;
    transport?: TransportSB
}

export interface SelectorSB {
    type: "selector";
    tag: string;
    outbounds: string[];
    interrupt_exist_connections: false;
}

export interface URLTestSB {
    type: "urltest";
    tag: string;
    outbounds: string[];
    url: string;
    interval: string;
    interrupt_exist_connections: false;
}

export type OutboundSB =
    | BaseOutboundSB
    | HttpOutboundSB
    | SocksOutboundSB
    | ShadowsocksOutboundSB
    | VlessOutboundSB
    | VmessOutboundSB
    | TrojanOutboundSB
    | SelectorSB
    | URLTestSB;

export type ChainOutbound = Exclude<OutboundSB, SelectorSB | URLTestSB>;

interface PeerSB {
    address: string;
    port: number;
    public_key: string;
    reserved: number[];
    allowed_ips: [
        "0.0.0.0/0",
        "::/0"
    ];
    persistent_keepalive_interval: number;
}

export interface WireguardEndpoint {
    tag: string;
    type: "wireguard";
    address: string[];
    mtu: 1280;
    peers: PeerSB[];
    private_key: string;
    detour?: string;
}

interface LogSB {
    disabled: boolean;
    level?: "warn" | "error" | "debug" | "info";
    timestamp: true;
}

interface NTPSB {
    enabled: true;
    server: string;
    server_port: number;
    domain_resolver: string;
    interval: string;
    write_to_system: false;
}

interface Experimental {
    cache_file: {
        enabled: true;
        store_fakeip: true;
    };
    clash_api: {
        external_controller: string;
        external_ui: "ui";
        default_mode: "Rule";
        external_ui_download_url: string;
        external_ui_download_detour: "direct";
    };
}

export interface ConfigSB {
    log: LogSB;
    dns: DNSSB;
    inbounds: Array<TunInbound | MixedInboundSB>;
    outbounds: OutboundSB[];
    endpoints?: WireguardEndpoint[];
    route: Route;
    ntp: NTPSB;
    experimental: Experimental;
}

// ===== PART 3: GLOBAL TYPES =====

declare global {
    interface GlobalConfig {
        readonly userID: string;
        readonly TrPass: string;
        readonly pathName: string;
        readonly fallbackDomain: string;
        readonly dohURL: string;
    }

    interface HttpConfig {
        readonly panelVersion: string;
        readonly defaultHttpPorts: number[];
        readonly defaultHttpsPorts: number[];
        readonly hostName: string;
        readonly client: string;
        readonly urlOrigin: string;
        readonly subPath: string;
    }

    interface WsConfig {
        readonly defaultProxyIPs: string[];
        readonly defaultPrefixes: string[];
        readonly envProxyIPs: string;
        readonly envPrefixes: string;
        wsProtocol?: "vl" | "tr";
        proxyMode?: "proxyip" | "prefix";
        panelIPs?: string[];
    }

    interface Env {
        readonly UUID: string;
        readonly TR_PASS: string;
        readonly PROXY_IP: string;
        readonly PREFIX: string;
        readonly FALLBACK: string;
        readonly DOH_URL: string;
        readonly kv: KVNamespace;
    }

    interface WarpAccount {
        privateKey: string;
        publicKey: string;
        warpIPv6: string;
        reserved: string;
    }

    interface DnsHost {
        host: string;
        isDomain: boolean;
        ipv4: string[];
        ipv6: string[];
    }

    interface DnsResult {
        ipv4: string[];
        ipv6: string[];
    }

    interface XrUdpNoise {
        type: "rand" | "str" | "base64" | "hex";
        packet: string;
        delay: string;
        applyTo: "ip" | "ipv4" | "ipv6";
        count: number;
    }

    interface Settings {
        localDNS: string;
        antiSanctionDNS: string;
        fakeDNS: boolean;
        enableIPv6: boolean;
        allowLANConnection: boolean;
        logLevel: "none" | "warning" | "error" | "info" | "debug";
        remoteDNS: string;
        remoteDnsHost: DnsHost;
        proxyIPMode: "proxyip" | "prefix";
        proxyIPs: string[];
        prefixes: string[];
        outProxy: string;
        outProxyParams: any;
        cleanIPs: string[];
        customCdnAddrs: string[];
        customCdnHost: string;
        customCdnSni: string;
        bestVLTRInterval: number;
        VLConfigs: boolean;
        TRConfigs: boolean;
        ports: number[];
        fingerprint: Fingerprint;
        enableTFO: boolean;
        fragmentMode: "custom" | "low" | "medium" | "high";
        fragmentLengthMin: number;
        fragmentLengthMax: number;
        fragmentIntervalMin: number;
        fragmentIntervalMax: number;
        fragmentPackets: "tlshello" | "1-1" | "1-2" | "1-3" | "1-5";
        fragmentMaxSplitMin?: number;
        fragmentMaxSplitMax?: number;
        enableECH: boolean;
        echServerName: string;
        bypassIran: boolean;
        bypassChina: boolean;
        bypassRussia: boolean;
        bypassOpenAi: boolean;
        bypassGoogleAi: boolean;
        bypassMicrosoft: boolean;
        bypassOracle: boolean;
        bypassDocker: boolean;
        bypassAdobe: boolean;
        bypassEpicGames: boolean;
        bypassIntel: boolean;
        bypassAmd: boolean;
        bypassNvidia: boolean;
        bypassAsus: boolean;
        bypassHp: boolean;
        bypassLenovo: boolean;
        blockAds: boolean;
        blockPorn: boolean;
        blockUDP443: boolean;
        blockMalware: boolean;
        blockPhishing: boolean;
        blockCryptominers: boolean;
        customBypassRules: string[];
        customBlockRules: string[];
        customBypassSanctionRules: string[];
        warpRemoteDNS: string;
        warpEndpoints: string[];
        bestWarpInterval: number;
        xrayUdpNoises: XrUdpNoise[];
        knockerNoiseMode: string;
        noiseCountMin: number;
        noiseCountMax: number;
        noiseSizeMin: number;
        noiseSizeMax: number;
        noiseDelayMin: number;
        noiseDelayMax: number;
        amneziaNoiseCount: number;
        amneziaNoiseSizeMin: number;
        amneziaNoiseSizeMax: number;
        panelVersion: string;
    }

    var settings: Settings;
    var globalConfig: GlobalConfig;
    var httpConfig: HttpConfig;
    var wsConfig: WsConfig;
    var dict: {
        readonly _VL_: string;
        readonly _VL_CAP_: string;
        readonly _VM_: string;
        readonly _TR_: string;
        readonly _TR_CAP_: string;
        readonly _SS_: string;
        readonly _V2_: string;
        readonly _project_: string;
        readonly _website_: string;
        readonly _public_proxy_ip_: string;
    };

    interface GeoAsset {
        rule: boolean;
        type: string;
        geosite: string;
        geoip?: string;
        geositeURL?: string;
        geoipURL?: string;
        dns?: string;
        format?: string;
    }

    const __VERSION__: string;
    const __ERROR_HTML_CONTENT__: string;
    const __ICON__: string;
    const __PANEL_HTML_CONTENT__: string;
    const __LOGIN_HTML_CONTENT__: string;
    const __SECRETS_HTML_CONTENT__: string;
    const __PROXY_IP_HTML_CONTENT__: string;

    interface Array<T> {
        concatIf<T>(condition: boolean, concat: T | T[]): T[];
    }

    interface Object {
        omitEmpty<T>(): T | undefined;
    }
}

export { };

// ===== PART 4: CLASH TYPES =====

type OptionalIntersection<T, U> = T | (T & U);
export type Network = "tcp" | "http" | "ws" | "httpupgrade" | "grpc";
export type ProtocolClash =
    | "http"
    | "socks5"
    | "ss"
    | "vless"
    | "trojan"
    | "vmess"
    | "wireguard";

export interface FakeDNS {
    "fake-ip-range": string;
    "fake-ip-filter-mode": "blacklist" | "whitelist";
    "fake-ip-filter": string[];
}

export type DNSClash = OptionalIntersection<{
    "enable": true;
    "listen": string;
    "ipv6": boolean;
    "respect-rules": true;
    "use-system-hosts": false;
    "enhanced-mode": "redir-host" | "fake-ip";
    "nameserver": string[];
    "proxy-server-nameserver": string[];
    "direct-nameserver": string[];
    "direct-nameserver-follow-policy": boolean;
    "nameserver-policy"?: Record<string, string>
    "hosts"?: DnsHosts
}, FakeDNS>;

export interface Tun {
    "enable": true;
    "stack": "mixed" | "gvisor" | "system";
    "auto-route": true;
    "strict-route": true;
    "auto-detect-interface": true;
    "dns-hijack": [
        "any:53",
        "tcp://any:53"
    ];
    "mtu": 9000;
}

export interface Sniffer {
    "enable": true;
    "force-dns-mapping": true;
    "parse-pure-ip": true;
    "override-destination": true;
    "sniff": {
        "HTTP": {
            "ports": number[];
        };
        "TLS": {
            "ports": number[];
        };
    };
}

export interface WsOpts {
    "path": string;
    "headers": {
        "Host"?: string;
    };
    "max-early-data"?: number;
    "early-data-header-name"?: "Sec-WebSocket-Protocol";
    "v2ray-http-upgrade"?: true;
    "v2ray-http-upgrade-fast-open"?: true;
}

export interface GrpcOpts {
    "grpc-service-name"?: string;
}

export interface HttpOpts {
    "method": "GET";
    "path": string[];
    "headers": {
        "Host"?: string[];
        "Connection": ["keep-alive"],
        "Content-Type": ["application/octet-stream"]
    };
}

export interface BaseOutboundClash {
    "name": string;
    "type": ProtocolClash;
    "server": string;
    "port": number;
    "udp": boolean;
    "ip-version": "ipv4" | "ipv4-prefer";
    "tfo"?: true;
    "dialer-proxy"?: string;
}

export interface RealityOpts {
    "public-key": string;
    "short-id": string;
}

export type TLSClash = {
    "tls": boolean;
    "sni"?: string;
    "servername"?: string;
    "alpn"?: string[];
    "client-fingerprint"?: Fingerprint;
    "skip-cert-verify": boolean;
    "reality-opts"?: RealityOpts;
    "ech-opts"?: {
        "enable": boolean;
        "query-server-name"?: string;
    };
}

export type TransportClash = {
    "network"?: Network;
    "ws-opts"?: WsOpts;
    "http-opts"?: HttpOpts;
    "grpc-opts"?: GrpcOpts;
}

export interface HttpOutboundClash extends BaseOutboundClash {
    "username"?: string;
    "password"?: string;
}

export interface SocksOutboundClash extends BaseOutboundClash {
    "username"?: string;
    "password"?: string;
}

export interface ShadowsocksOutboundClash extends BaseOutboundClash {
    "password"?: string;
    "cipher"?: string;
}

export type VlessOutboundClash = BaseOutboundClash & OptionalIntersection<{
    "uuid": string;
    "flow"?: "xtls-rprx-vision";
    "servername"?: string;
    "packet-encoding"?: "";
}, TLSClash> & TransportClash;

export type VmessOutboundClash = BaseOutboundClash & OptionalIntersection<{
    "uuid": string;
    "cipher": "auto";
    "alterId": number;
    "packet-encoding"?: "";
}, TLSClash> & TransportClash;

export type TrojanOutboundClash = BaseOutboundClash & {
    "password": string;
} & TLSClash & TransportClash;

export interface AmneziaOpts {
    "jc": number;
    "jmin": number;
    "jmax": number;
}

export interface WireguardOutboundClash extends BaseOutboundClash {
    "ip": string;
    "ipv6": string;
    "private-key": string;
    "public-key": string;
    "allowed-ips": string[]
    "reserved": string;
    "udp": true;
    "mtu": 1280;
    "amnezia-wg-option"?: AmneziaOpts;
}

export interface SelectorClash {
    "name": string;
    "type": "select";
    "proxies": string[];
}

export interface URLTestClash {
    "name": string;
    "type": "url-test";
    "proxies": string[];
    "url"?: string;
    "interval"?: number;
    "tolerance"?: number;
}

export type OutboundClash =
    | HttpOutboundClash
    | SocksOutboundClash
    | ShadowsocksOutboundClash
    | VlessOutboundClash
    | VmessOutboundClash
    | TrojanOutboundClash
    | WireguardOutboundClash;

export type ChainOutboundClash = Exclude<OutboundClash, WireguardOutboundClash>;

export interface RuleProvider {
    "type": "http";
    "format": string;
    "behavior": "domain" | "ipcidr";
    "url": string;
    "path": string;
    "interval": number;
}

interface ExternalControllerCors {
    "allow-origins": ["*"];
    "allow-private-network": true;
}

interface Profile {
    "store-selected": true;
    "store-fake-ip": true;
}

interface NTPClash {
    "enable": true;
    "server": string;
    "port": number;
    "interval": number;
}

export interface ConfigClash {
    "mixed-port": number;
    "ipv6": boolean;
    "allow-lan": boolean;
    "mode": "rule";
    "log-level": string;
    "disable-keep-alive"?: boolean;
    "keep-alive-idle"?: number;
    "keep-alive-interval"?: number;
    "tcp-concurrent"?: boolean;
    "unified-delay": false;
    "geo-auto-update": true;
    "geo-update-interval": 168;
    "external-controller": string;
    "external-controller-cors": ExternalControllerCors;
    "external-ui": "ui";
    "external-ui-url": string;
    "profile": Profile;
    "dns": DNSClash;
    "tun": Tun;
    "sniffer": Sniffer;
    "proxies": OutboundClash[];
    "proxy-groups": Array<SelectorClash | URLTestClash>;
    "rule-providers"?: Record<string, RuleProvider>;
    "rules": string[];
    "ntp": NTPClash;
}