// ============================================
// BPB PANEL - XRAY FULL CORE (COMPLETE ORIGINAL)
// Version: 4.1.3
// ============================================

import { getGeoAssets } from './geo-assets';
import { RoutingRule } from 'types/xray';
import { accRoutingRules } from '@utils';

export function buildRoutingRules(
    isChain: boolean,
    isBalancer: boolean,
    isWorkerless: boolean,
    isWarp: boolean
): RoutingRule[] {
    const { blockUDP443 } = globalThis.settings;
    const rules: RoutingRule[] = [
        {
            inboundTag: [
                "mixed-in"
            ],
            port: 53,
            outboundTag: "dns-out",
            type: "field"
        },
        {
            inboundTag: [
                "dns-in"
            ],
            outboundTag: "dns-out",
            type: "field"
        }
    ];

    const finallOutboundTag = isChain ? "chain" : isWorkerless ? "direct" : "proxy";
    const outTag = isBalancer ? isChain ? "all-chains" : "all-proxies" : finallOutboundTag;
    const remoteDnsProxy = isBalancer ? "all-proxies" : "proxy";

    addRoutingRule(rules, ["remote-dns"], undefined, undefined, undefined, undefined, undefined, remoteDnsProxy, isBalancer);
    addRoutingRule(rules, ["dns"], undefined, undefined, undefined, undefined, undefined, "direct", false);

    addRoutingRule(rules, undefined, ["geosite:private"], undefined, undefined, undefined, undefined, "direct", false);
    addRoutingRule(rules, undefined, undefined, ["geoip:private"], undefined, undefined, undefined, "direct", false);

    if (!(isWarp || isWorkerless)) {
        addRoutingRule(rules, undefined, undefined, undefined, undefined, "udp", undefined, "block", false);
    } else if (blockUDP443) {
        addRoutingRule(rules, undefined, undefined, undefined, 443, "udp", undefined, "block", false);
    }

    const geoRules: GeoAsset[] = getGeoAssets();
    const routingRules = accRoutingRules(geoRules);

    const blockDomains = [
        ...routingRules.block.geosites,
        ...routingRules.block.domains.map(domain => `domain:${domain}`)
    ];

    if (blockDomains.length) {
        addRoutingRule(rules, undefined, blockDomains, undefined, undefined, undefined, undefined, 'block');
    }

    const blockIPs = [
        ...routingRules.block.geoips as string[],
        ...routingRules.block.ips
    ];

    if (blockIPs.length) {
        addRoutingRule(rules, undefined, undefined, blockIPs, undefined, undefined, undefined, 'block');
    }

    const bypassDomains = [
        ...routingRules.bypass.geosites,
        ...routingRules.bypass.domains.map(domain => `domain:${domain}`)
    ];

    if (bypassDomains.length) {
        addRoutingRule(rules, undefined, bypassDomains, undefined, undefined, undefined, undefined, 'direct');
    }

    const bypassIPs = [
        ...routingRules.bypass.geoips,
        ...routingRules.bypass.ips
    ];

    if (bypassIPs.length) {
        addRoutingRule(rules, undefined, undefined, bypassIPs, undefined, undefined, undefined, 'direct');
    }

    if (isWorkerless) {
        addRoutingRule(rules, undefined, undefined, undefined, undefined, "tcp", ["tls"], "proxy", false);
        addRoutingRule(rules, undefined, undefined, undefined, undefined, "tcp", ["http"], "http-fragment", false);
        addRoutingRule(rules, undefined, undefined, undefined, undefined, "udp", ["quic"], "udp-noise", false);
        addRoutingRule(rules, undefined, undefined, undefined, "443,2053,2083,2087,2096,8443", "udp", undefined, "udp-noise", false);
    }

    const network = isWarp || isWorkerless ? "tcp,udp" : "tcp";
    addRoutingRule(rules, undefined, undefined, undefined, undefined, network, undefined, outTag, isBalancer);

    return rules;
}

const addRoutingRule = (
    rules: RoutingRule[],
    inboundTag?: string[],
    domain?: string[],
    ip?: string[],
    port?: number | string,
    network?: "tcp" | "udp" | "tcp,udp",
    protocol?: ("http" | "tls" | "bittorrent" | "quic")[],
    outboundTag?: string,
    isBalancer?: boolean
) => rules.push({
    inboundTag,
    domain,
    ip,
    port,
    network,
    protocol,
    balancerTag: isBalancer ? outboundTag : undefined,
    outboundTag: isBalancer ? undefined : outboundTag,
    type: "field"
});

// ===== SECOND FILE: OUTBOUNDS =====

import {
    base64ToDecimal,
    isHttps,
    generateWsPath,
    toRange,
    selectSniHost
} from '@utils';

import {
    Outbound,
    StreamSettings,
    Sockopt,
    VlessSettings,
    TrojanSettings,
    TlsSettings,
    RealitySettings,
    RawSettings,
    WsSettings,
    HttpupgradeSettings,
    GrpcSettings,
    HttpSocksSettings,
    ShadowsocksSettings,
    VmessSettings,
    Noise,
    FreedomSettings,
    WireguardSettings,
    Fingerprint,
    TransportType,
    DomainStrategy,
    Transport
} from 'types/xray';

function buildOutbound<T>(
    protocol: string,
    tag: string,
    enableMux: boolean,
    settings: T,
    streamSettings?: StreamSettings
): Outbound {
    return {
        protocol,
        mux: enableMux ? {
            enabled: true,
            concurrency: 8,
            xudpConcurrency: 16,
            xudpProxyUDP443: "reject"
        } : undefined,
        settings: settings,
        streamSettings,
        tag
    } as Outbound;
}

export function buildFreedomOutbound(
    isFragment: boolean,
    isUdpNoises: boolean,
    tag: string,
    length?: string,
    interval?: string,
    packets?: "tlshello" | "1-1" | "1-2" | "1-3" | "1-5"
): Outbound {
    const {
        fragmentPackets,
        fragmentLengthMin,
        fragmentLengthMax,
        fragmentIntervalMin,
        fragmentIntervalMax,
        fragmentMaxSplitMin,
        fragmentMaxSplitMax,
        enableTFO,
        xrayUdpNoises,
        enableIPv6
    } = globalThis.settings;

    let freedomSettings: FreedomSettings = {};
    let streamSettings: StreamSettings | undefined;

    if (isFragment) {
        freedomSettings = {
            fragment: {
                packets: packets || fragmentPackets,
                length: length || toRange(fragmentLengthMin, fragmentLengthMax) as string,
                interval: interval || toRange(fragmentIntervalMin, fragmentIntervalMax) as string,
                maxSplit: toRange(fragmentMaxSplitMin, fragmentMaxSplitMax)
            }
        };

        streamSettings = {
            sockopt: buildSockopt(true, enableTFO, "UseIP")
        } satisfies StreamSettings;
    }

    if (isUdpNoises) {
        const freedomNoises: Noise[] = [];
        xrayUdpNoises.forEach((noise: XrUdpNoise) => {
            const { count, ...rest } = noise;
            freedomNoises.push(...Array.from({ length: count }, () => rest));
        });

        freedomSettings = {
            ...freedomSettings,
            noises: freedomNoises,
            domainStrategy: isFragment
                ? undefined
                : enableIPv6 ? "UseIPv4v6" : "UseIPv4"
        };
    }

    return {
        protocol: "freedom",
        settings: freedomSettings,
        streamSettings,
        tag
    } satisfies Outbound;
}

export function buildWebsocketOutbound(
    protocol: string,
    address: string,
    port: number,
    isFragment: boolean
): Outbound {
    const {
        settings: {
            fingerprint,
            enableTFO,
            enableECH,
            echServerName
        },
        globalConfig: { userID, TrPass },
        dict: { _VL_ }
    } = globalThis;

    const isTLS = isHttps(port);
    const { host, sni, allowInsecure } = selectSniHost(address);
    const tlsSettings = isTLS ? buildTlsSettings(
        sni,
        fingerprint,
        "http/1.1",
        allowInsecure,
        enableECH && !isFragment,
        echServerName || undefined,
    ) : undefined;

    const streamSettings: StreamSettings = {
        network: "ws",
        ...buildTransport("ws", "none", `${generateWsPath(protocol)}?ed=2560`, host),
        security: isTLS ? "tls" : "none",
        tlsSettings,
        sockopt: isFragment
            ? buildSockopt(false, false, undefined, "fragment")
            : buildSockopt(true, enableTFO, "UseIP"),
    };

    if (protocol === _VL_) return buildOutbound<VlessSettings>(protocol, "proxy", false, {
        vnext: [{
            address,
            port,
            users: [
                {
                    id: userID,
                    encryption: "none"
                }
            ]
        }]
    }, streamSettings);

    return buildOutbound<TrojanSettings>(protocol, "proxy", false, {
        servers: [{
            address,
            port,
            password: TrPass
        }]
    }, streamSettings);
}

export function buildWarpOutbound(
    warpAccount: WarpAccount,
    endpoint: string,
    isWoW: boolean,
    isPro: boolean
): Outbound {
    const {
        warpIPv6,
        reserved,
        publicKey,
        privateKey
    } = warpAccount;
    const { client } = globalThis.httpConfig;

    let wgSettings: WireguardSettings = {
        address: [
            "172.16.0.2/32",
            warpIPv6
        ],
        mtu: 1280,
        peers: [
            {
                endpoint: isWoW ? "162.159.192.1:2408" : endpoint,
                publicKey: publicKey,
                keepAlive: 5
            }
        ],
        reserved: base64ToDecimal(reserved),
        secretKey: privateKey
    };

    const chain = isWoW
        ? "proxy"
        : isPro && client === 'xray' ? "udp-noise" : "";

    const streamSettings = chain ? {
        sockopt: buildSockopt(false, false, undefined, chain)
    } : undefined;

    if (client === 'xray-knocker' && !isWoW) {
        const {
            knockerNoiseMode,
            noiseCountMin,
            noiseCountMax,
            noiseSizeMin,
            noiseSizeMax,
            noiseDelayMin,
            noiseDelayMax
        } = globalThis.settings;

        wgSettings = {
            ...wgSettings,
            wnoise: knockerNoiseMode,
            wnoisecount: toRange(noiseCountMin, noiseCountMax),
            wpayloadsize: toRange(noiseSizeMin, noiseSizeMax),
            wnoisedelay: toRange(noiseDelayMin, noiseDelayMax)
        };
    }

    return {
        protocol: "wireguard",
        settings: wgSettings,
        streamSettings,
        tag: isWoW ? "chain" : "proxy"
    } satisfies Outbound;
}

export function buildChainOutbound(): Outbound | undefined {
    const {
        dict: { _VL_, _TR_, _SS_, _VM_ },
        settings: {
            outProxyParams: {
                protocol, server: address, port,
                user, pass, password, method, uuid,
                flow, security, type, sni, fp,
                host, path, alpn, pbk, sid, spx,
                headerType, serviceName, mode,
                authority
            }
        }
    } = globalThis;

    const streamSettings: StreamSettings = {
        network: type || "raw",
        ...buildTransport(type, headerType, path, host, serviceName, mode, authority),
        security,
        tlsSettings: security === 'tls' ? buildTlsSettings(sni || address, fp, alpn, false, false, undefined) : undefined,
        realitySettings: security === "reality" ? buildRealitySettings(sni, fp, pbk, sid, spx) : undefined,
        sockopt: buildSockopt(false, false, "UseIPv4", "proxy")
    };

    const enableMux = !(security === "reality" || type === "grpc");

    switch (protocol) {
        case 'http':
        case 'socks':
            return buildOutbound<HttpSocksSettings>(protocol, "chain", enableMux, {
                servers: [{
                    address,
                    port,
                    users: [{
                        user,
                        pass
                    }]
                }]
            }, streamSettings);

        case _SS_:
            return buildOutbound<ShadowsocksSettings>(protocol, "chain", enableMux, {
                servers: [{
                    address,
                    port,
                    method,
                    password
                }]
            }, streamSettings);

        case _VL_:
            return buildOutbound<VlessSettings>(protocol, "chain", enableMux, {
                vnext: [{
                    address,
                    port,
                    users: [{
                        id: uuid,
                        flow: flow,
                        encryption: "none"
                    }]
                }]
            }, streamSettings);

        case _VM_:
            return buildOutbound<VmessSettings>(protocol, "chain", enableMux, {
                vnext: [{
                    address,
                    port,
                    users: [{
                        id: uuid,
                        security: "auto"
                    }]
                }]
            }, streamSettings);

        case _TR_:
            return buildOutbound<TrojanSettings>(protocol, "chain", enableMux, {
                servers: [{
                    address,
                    port,
                    password
                }]
            }, streamSettings);

        default:
            return undefined;
    }
}

function buildTransport(
    type: TransportType,
    headerType?: "http" | "none",
    path: string = "/",
    host?: string,
    serviceName?: string,
    mode?: string,
    authority?: string
): Record<string, Transport> {
    switch (type) {
        case 'tcp':
        case 'raw':
            return {
                rawSettings: {
                    header: headerType === 'http'
                        ? {
                            type: "http",
                            request: {
                                headers: {
                                    "Host": host?.split(','),
                                    "Accept-Encoding": ["gzip, deflate"],
                                    "Connection": ["keep-alive"],
                                    "Pragma": "no-cache"
                                },
                                path: path.split(','),
                                method: "GET",
                                version: "1.1"
                            }
                        }
                        : { type: "none" }
                } satisfies RawSettings
            };

        case 'ws':
            return {
                wsSettings: {
                    host: host,
                    path: path
                } satisfies WsSettings
            };

        case 'httpupgrade':
            return {
                httpupgradeSettings: {
                    host: host,
                    path: path
                } satisfies HttpupgradeSettings
            };

        case 'grpc':
            return {
                grpcSettings: {
                    authority: authority,
                    multiMode: mode === 'multi',
                    serviceName: serviceName
                } satisfies GrpcSettings
            };

        default:
            return {};
    };
}

function buildSockopt(
    enableHappyEyeballs: boolean,
    tcpFastOpen: boolean,
    domainStrategy?: DomainStrategy,
    dialerProxy?: string
): Sockopt {
    return {
        domainStrategy,
        dialerProxy,
        tcpFastOpen: tcpFastOpen || undefined,
        happyEyeballs: enableHappyEyeballs ? {
            tryDelayMs: 250,
            prioritizeIPv6: false,
            interleave: 2,
            maxConcurrentTry: 4
        } : undefined
    };
}

function buildTlsSettings(
    serverName: string,
    fingerprint: Fingerprint,
    alpn: string,
    allowInsecure: boolean,
    enableECH: boolean,
    echServerName?: string
): TlsSettings {
    const { localDNS } = globalThis.settings;
    const echQueryDNS = localDNS === "localhost" ? "8.8.8.8" : localDNS;
    
    return {
        serverName,
        fingerprint: fingerprint,
        alpn: alpn?.split(','),
        allowInsecure,
        echConfigList: enableECH 
            ? echServerName 
                ? `${echServerName}+udp://${echQueryDNS}`
                : `udp://${echQueryDNS}` 
            : undefined
    };
}

function buildRealitySettings(
    serverName: string,
    fingerprint: Fingerprint,
    publicKey: string,
    shortId: string,
    spiderX: string
): RealitySettings {
    return {
        serverName,
        fingerprint: fingerprint,
        publicKey,
        shortId,
        spiderX,
        show: false,
        allowInsecure: false
    };
}

// ===== THIRD FILE: INBOUNDS =====

import { DokodemoDoorInbound, MixedInbound } from "types/xray";

export function buildMixedInbound(
    allowLANConnection: boolean,
    sniffQuic: boolean,
    sniffFakeDNS: boolean
): MixedInbound {
    const destOverride: Array<"http" | "tls" | "quic" | "fakedns"> = ["http", "tls"]
        .concatIf(sniffQuic, "quic")
        .concatIf(sniffFakeDNS, "fakedns");

    return {
        listen: allowLANConnection ? "0.0.0.0" : "127.0.0.1",
        port: 10808,
        protocol: "socks",
        settings: {
            auth: "noauth",
            udp: true
        },
        sniffing: {
            destOverride,
            enabled: true,
            routeOnly: true
        },
        tag: "mixed-in"
    };
}

export function buildDokodemoInbound(allowLANConnection: boolean): DokodemoDoorInbound {
    return {
        listen: allowLANConnection ? "0.0.0.0" : "127.0.0.1",
        port: 10853,
        protocol: "dokodemo-door",
        settings: {
            address: "1.1.1.1",
            network: "tcp,udp",
            port: 53
        },
        tag: "dns-in"
    };
}

// ===== FOURTH FILE: GEO ASSETS =====

export function getGeoAssets(): GeoAsset[] {
    const {
        localDNS,
        antiSanctionDNS,
        blockMalware,
        blockPhishing,
        blockCryptominers,
        blockAds,
        blockPorn,
        bypassIran,
        bypassChina,
        bypassRussia,
        bypassOpenAi,
        bypassGoogleAi,
        bypassMicrosoft,
        bypassOracle,
        bypassDocker,
        bypassAdobe,
        bypassEpicGames,
        bypassIntel,
        bypassAmd,
        bypassNvidia,
        bypassAsus,
        bypassHp,
        bypassLenovo,
    } = globalThis.settings;

    return [
        { rule: blockAds, type: 'block', geosite: "geosite:category-ads-all" },
        { rule: blockAds, type: 'block', geosite: "geosite:category-ads-ir" },
        { rule: blockPorn, type: 'block', geosite: "geosite:category-porn" },
        { rule: blockMalware, type: 'block', geosite: "geosite:malware", geoip: "geoip:malware" },
        { rule: blockPhishing, type: 'block', geosite: "geosite:phishing", geoip: "geoip:phishing" },
        { rule: blockCryptominers, type: 'block', geosite: "geosite:cryptominers" },
        { rule: bypassIran, type: 'direct', geosite: "geosite:category-ir", geoip: "geoip:ir", dns: localDNS },
        { rule: bypassChina, type: 'direct', geosite: "geosite:cn", geoip: "geoip:cn", dns: localDNS },
        { rule: bypassRussia, type: 'direct', geosite: "geosite:category-ru", geoip: "geoip:ru", dns: localDNS },
        { rule: bypassOpenAi, type: 'direct', geosite: "geosite:openai", dns: antiSanctionDNS },
        { rule: bypassGoogleAi, type: 'direct', geosite: "geosite:google-deepmind", dns: antiSanctionDNS },
        { rule: bypassMicrosoft, type: 'direct', geosite: "geosite:microsoft", dns: antiSanctionDNS },
        { rule: bypassOracle, type: 'direct', geosite: "geosite:oracle", dns: antiSanctionDNS },
        { rule: bypassDocker, type: 'direct', geosite: "geosite:docker", dns: antiSanctionDNS },
        { rule: bypassAdobe, type: 'direct', geosite: "geosite:adobe", dns: antiSanctionDNS },
        { rule: bypassEpicGames, type: 'direct', geosite: "geosite:epicgames", dns: antiSanctionDNS },
        { rule: bypassIntel, type: 'direct', geosite: "geosite:intel", dns: antiSanctionDNS },
        { rule: bypassAmd, type: 'direct', geosite: "geosite:amd", dns: antiSanctionDNS },
        { rule: bypassNvidia, type: 'direct', geosite: "geosite:nvidia", dns: antiSanctionDNS },
        { rule: bypassAsus, type: 'direct', geosite: "geosite:asus", dns: antiSanctionDNS },
        { rule: bypassHp, type: 'direct', geosite: "geosite:hp", dns: antiSanctionDNS },
        { rule: bypassLenovo, type: 'direct', geosite: "geosite:lenovo", dns: antiSanctionDNS },
    ].filter(({ rule }) => rule);
}

// ===== FIFTH FILE: DNS =====

import type { DNS, DnsServer, DnsHosts } from 'types/xray';
import { resolveDNS, isDomain, getDomain, accDnsRules } from '@utils';

export async function buildDNS(
    outboundAddrs: string[],
    isWorkerLess: boolean,
    isWarp: boolean,
    domainToStaticIPs?: string,
    customDns?: string,
    customDnsHosts?: string[]
): Promise<DNS> {
    const {
        localDNS,
        remoteDNS,
        warpRemoteDNS,
        antiSanctionDNS,
        remoteDnsHost,
        enableIPv6,
        fakeDNS
    } = globalThis.settings;

    const hosts: DnsHosts = {};
    const servers: DnsServer[] = [];
    const fakeDnsDomains = [];

    if (remoteDnsHost.isDomain && !isWorkerLess && !isWarp) {
        const { ipv4, ipv6, host } = remoteDnsHost;
        hosts[host] = ipv4.concatIf(enableIPv6, ipv6);
    }

    if (domainToStaticIPs) {
        const { ipv4, ipv6 } = await resolveDNS(domainToStaticIPs, enableIPv6);
        hosts[domainToStaticIPs] = [...ipv4, ...ipv6];
    }

    let skipFallback = true;
    let finalRemoteDNS = isWarp ? warpRemoteDNS : remoteDNS;

    if (isWorkerLess) {
        finalRemoteDNS = `https://${customDns}/dns-query`;
        if (customDns && customDnsHosts) hosts[customDns] = customDnsHosts;
        skipFallback = false;
    }

    const remoteDnsServer = buildDnsServer(finalRemoteDNS, undefined, undefined, undefined, undefined, "remote-dns");
    servers.push(remoteDnsServer);

    const geoAssets = getGeoAssets();
    const dnsRules = accDnsRules(geoAssets);

    const blockDomains = [
        ...dnsRules.block.geosites,
        ...dnsRules.block.domains.map(domain => `domain:${domain}`)
    ];

    blockDomains.forEach(domain => hosts[domain] = '#3');

    dnsRules.bypass.localDNS.geositeGeoips.forEach(({ geosite, geoip }) => {
        const localDnsServer = buildDnsServer(localDNS, [geosite], [geoip!], skipFallback);
        servers.push(localDnsServer);
        fakeDnsDomains.push(geosite);
    });

    const sanctionDomains = [
        ...dnsRules.bypass.antiSanctionDNS.geosites,
        ...dnsRules.bypass.antiSanctionDNS.domains.map(domain => `domain:${domain}`)
    ];

    const bypassDomains = [
        ...dnsRules.bypass.localDNS.geosites,
        ...dnsRules.bypass.localDNS.domains.map(domain => `domain:${domain}`),
        ...outboundAddrs.filter(isDomain).map(domain => `full:${domain}`)
    ];

    if (sanctionDomains.length) {
        const sanctionDnsServer = buildDnsServer(antiSanctionDNS, sanctionDomains, undefined, skipFallback, true);
        servers.push(sanctionDnsServer);
        
        const { host, isHostDomain } = getDomain(antiSanctionDNS);
        if (isHostDomain) bypassDomains.push(`full:${host}`);
    }

    customDnsHosts?.filter(isDomain).forEach(host => bypassDomains.push(`full:${host}`));

    if (bypassDomains.length) {
        const localDnsServer = buildDnsServer(localDNS, bypassDomains, undefined, skipFallback);
        servers.push(localDnsServer);
        fakeDnsDomains.push(...bypassDomains);
    }

    if (fakeDNS) {
        const fakeDNSServer = fakeDnsDomains.length
            ? buildDnsServer("fakedns", fakeDnsDomains, undefined, false, undefined)
            : "fakedns";

        servers.unshift(fakeDNSServer);
    }

    return {
        hosts: hosts.omitEmpty(),
        servers,
        queryStrategy: isWarp && !enableIPv6 ? "UseIPv4" : "UseIP",
        tag: "dns"
    };
}

function buildDnsServer(
    address: string,
    domains?: string[],
    expectIPs?: string[],
    skipFallback?: boolean,
    finalQuery?: boolean,
    tag?: string
): DnsServer {
    return {
        address,
        domains,
        expectIPs,
        skipFallback,
        finalQuery,
        tag
    };
}

// ===== SIXTH FILE: CONFIG =====

import { getDataset } from 'kv';
import { buildDNS } from './dns';
import { buildRoutingRules } from './routing';
import type { Balancer, Config, Observatory, Outbound } from 'types/xray';
import { buildDokodemoInbound, buildMixedInbound } from './inbounds';
import {
    buildChainOutbound,
    buildWebsocketOutbound,
    buildWarpOutbound,
    buildFreedomOutbound
} from './outbounds';

import {
    getConfigAddresses,
    generateRemark,
    isDomain,
    isHttps,
    getProtocols,
    parseHostPort,
    toRange
} from '@utils';

function buildBalancer(tag: string, selector: string, hasFallback: boolean): Balancer {
    return {
        tag,
        selector: [selector],
        strategy: {
            type: "leastPing",
        },
        fallbackTag: hasFallback ? "proxy-2" : undefined
    };
}

async function buildConfig(
    remark: string,
    outbounds: Outbound[],
    isBalancer: boolean,
    isChain: boolean,
    balancerFallback: boolean,
    isWarp: boolean,
    isWorkerLess: boolean,
    outboundAddrs: string[],
    domainToStaticIPs?: string,
    customDns?: string,
    customDnsHosts?: string[]
): Promise<Config> {
    const {
        fakeDNS,
        bestWarpInterval,
        bestVLTRInterval,
        logLevel,
        allowLANConnection
    } = globalThis.settings;
    let balancers, observatory;

    if (isBalancer) {
        balancers = [buildBalancer("all-proxies", "proxy", balancerFallback)]
            .concatIf(isChain, buildBalancer("all-chains", "chain", false));

        observatory = {
            subjectSelector: isChain ? ["chain", "proxy"] : ["proxy"],
            probeUrl: "https://www.gstatic.com/generate_204",
            probeInterval: `${isWarp
                ? bestWarpInterval
                : bestVLTRInterval}s`,
            enableConcurrency: true
        } satisfies Observatory;
    }

    const config: Config = {
        remarks: remark,
        version: {
            min: "25.10.15"
        },
        log: {
            loglevel: logLevel,
        },
        dns: await buildDNS(outboundAddrs, isWorkerLess, isWarp, domainToStaticIPs, customDns, customDnsHosts),
        inbounds: [
            buildMixedInbound(allowLANConnection, isWorkerLess, fakeDNS),
            buildDokodemoInbound(allowLANConnection)
        ],
        outbounds: [
            ...outbounds,
            {
                protocol: "dns",
                settings: {
                    nonIPQuery: "reject"
                },
                tag: "dns-out"
            },
            {
                protocol: "freedom",
                settings: {
                    domainStrategy: "UseIP"
                },
                tag: "direct"
            },
            {
                protocol: "blackhole",
                settings: {
                    response: {
                        type: "http"
                    }
                },
                tag: "block"
            },
        ],
        routing: {
            domainStrategy: "IPIfNonMatch",
            rules: buildRoutingRules(isChain, isBalancer, isWorkerLess, isWarp),
            balancers
        },
        observatory,
        policy: {
            levels: {
                0: {
                    connIdle: 300,
                    handshake: 4,
                    uplinkOnly: 1,
                    downlinkOnly: 1
                }
            },
            system: {
                statsOutboundUplink: true,
                statsOutboundDownlink: true
            }
        },
        stats: {}
    };

    return config;
}

async function addBestPingConfigs(
    configs: Config[],
    totalAddresses: string[],
    proxyOutbounds: Outbound[],
    chainOutbounds: Outbound[],
    isFragment: boolean
) {
    const isChain = !!chainOutbounds.length;
    const chainSign = isChain ? '🔗 ' : '';
    const configType = isFragment ? ' F' : '';
    const remark = `💦 ${chainSign}Best Ping${configType} 🚀`;
    const outbounds = [
        ...chainOutbounds,
        ...proxyOutbounds
    ];

    if (isFragment) {
        const fragmentOutbound = buildFreedomOutbound(true, false, 'fragment');
        outbounds.push(fragmentOutbound);
    }

    const config = await buildConfig(remark, outbounds, true, isChain, true, false, false, totalAddresses);

    if (isChain) {
        await addBestPingConfigs(configs, totalAddresses, proxyOutbounds, [], isFragment);
    }

    configs.push(config);
}

async function addBestFragmentConfigs(
    configs: Config[],
    outbound: Outbound,
    chainProxy?: Outbound
) {
    const {
        httpConfig: { hostName },
        settings: { fragmentIntervalMin, fragmentIntervalMax }
    } = globalThis;

    const isChain = !!chainProxy;
    const outbounds: Outbound[] = [];
    const bestFragValues = [
        "1-5", "1-10", "10-20", "20-30",
        "30-40", "40-50", "50-60", "60-70",
        "70-80", "80-90", "90-100", "10-30",
        "20-40", "30-50", "40-60", "50-70",
        "60-80", "70-90", "80-100", "100-200"
    ];

    bestFragValues.forEach((fragLength, index) => {
        if (isChain) {
            const chain = modifyOutbound(chainProxy, `chain-${index + 1}`, `proxy-${index + 1}`);
            outbounds.push(chain);
        }

        const proxy = modifyOutbound(outbound, `proxy-${index + 1}`, `fragment-${index + 1}`);
        const fragInterval = toRange(fragmentIntervalMin, fragmentIntervalMax);
        const fragment = buildFreedomOutbound(true, false, `fragment-${index + 1}`, fragLength, fragInterval);
        outbounds.push(proxy, fragment);
    });

    const chainSign = isChain ? '🔗 ' : '';
    const config = await buildConfig(
        `💦 ${chainSign}Best Fragment 😎`,
        outbounds,
        true,
        isChain,
        false,
        false,
        false,
        [],
        hostName
    );

    if (chainProxy) {
        await addBestFragmentConfigs(configs, outbound);
    }

    configs.push(config);
}

async function addWorkerlessConfigs(configs: Config[]) {
    const tlsFragment = buildFreedomOutbound(true, false, 'proxy');
    const udpNoise = buildFreedomOutbound(false, true, 'udp-noise');
    const httpFragment = buildFreedomOutbound(true, false, 'http-fragment', undefined, undefined, '1-1');
    const outbounds = [
        tlsFragment,
        httpFragment,
        udpNoise
    ];

    const cfDnsConfig = await buildConfig(
        `💦 1 - Workerless ⭐`,
        outbounds,
        false,
        false,
        false,
        false,
        true,
        [],
        undefined,
        "cloudflare-dns.com",
        ["cloudflare.com"]
    );

    const googleDnsConfig = await buildConfig(
        `💦 2 - Workerless ⭐`,
        outbounds,
        false,
        false,
        false,
        false,
        true,
        [],
        undefined,
        "dns.google",
        ["8.8.8.8", "8.8.4.4"]
    );

    configs.push(cfDnsConfig, googleDnsConfig);
}

export async function getXrCustomConfigs(isFragment: boolean): Promise<Response> {
    const { outProxy, ports } = globalThis.settings;
    const chainProxy = outProxy ? buildChainOutbound() : undefined;

    const Addresses = await getConfigAddresses(isFragment);
    const totalPorts = ports.filter(port => !isFragment || isHttps(port));
    const protocols = getProtocols();

    const configs: Config[] = [];
    const proxies: Outbound[] = [];
    const chains: Outbound[] = [];
    const fragment = isFragment ? [buildFreedomOutbound(true, false, 'fragment')] : [];
    let index = 1;

    for (const protocol of protocols) {
        let protocolIndex = 1;
        for (const port of totalPorts) {
            for (const addr of Addresses) {
                const outbound = buildWebsocketOutbound(protocol, addr, port, isFragment);
                const outbounds = [outbound, ...fragment];

                const proxy = modifyOutbound(outbound, `proxy-${index}`);
                proxies.push(proxy);

                const remark = generateRemark(protocolIndex, port, addr, protocol, isFragment, false);
                const config = await buildConfig(remark, outbounds, false, false, false, false, false, [addr]);
                configs.push(config);

                if (chainProxy) {
                    const remark = generateRemark(protocolIndex, port, addr, protocol, isFragment, true);
                    const chainConfig = await buildConfig(remark, [chainProxy, ...outbounds], false, true, false, false, false, [addr]);
                    configs.push(chainConfig);

                    const chain = modifyOutbound(chainProxy, `chain-${index}`, `proxy-${index}`);
                    chains.push(chain);
                }

                protocolIndex++;
                index++;
            }
        }
    }

    await addBestPingConfigs(configs, Addresses, proxies, chains, isFragment);

    if (isFragment) {
        await addBestFragmentConfigs(configs, proxies[0], chainProxy);
        await addWorkerlessConfigs(configs);
    }

    return new Response(JSON.stringify(configs, null, 4), {
        status: 200,
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Cache-Control': 'no-store',
            'CDN-Cache-Control': 'no-store'
        }
    });
}

export async function getXrWarpConfigs(
    request: Request,
    env: Env,
    isPro: boolean,
    isKnocker: boolean
): Promise<Response> {
    const { warpEndpoints } = globalThis.settings;
    const { warpAccounts } = await getDataset(request, env);

    const proIndicator = isPro ? ' Pro ' : ' ';
    const configs: Config[] = [];
    const proxies: Outbound[] = [];
    const chains: Outbound[] = [];
    const outboundDomains: string[] = [];
    const udpNoise: Outbound[] = isPro && !isKnocker ? [buildFreedomOutbound(false, true, 'udp-noise')] : [];

    for (const [index, endpoint] of warpEndpoints.entries()) {
        const { host } = parseHostPort(endpoint);
        if (isDomain(host)) outboundDomains.push(host);

        const warpOutbound = buildWarpOutbound(warpAccounts[0], endpoint, false, isPro);
        const wowOutbound = buildWarpOutbound(warpAccounts[1], endpoint, true, isPro);

        const warpConfig = await buildConfig(
            `💦 ${index + 1} - Warp${proIndicator}🇮🇷`,
            [warpOutbound, ...udpNoise],
            false,
            false,
            false,
            true,
            false,
            [host]
        );

        const wowConfig = await buildConfig(
            `💦 ${index + 1} - WoW${proIndicator}🌍`,
            [wowOutbound, warpOutbound, ...udpNoise],
            false,
            true,
            false,
            true,
            false,
            [host]
        );

        configs.push(warpConfig, wowConfig);

        const proxy = modifyOutbound(warpOutbound, `proxy-${index + 1}`);
        proxies.push(proxy);

        const chain = modifyOutbound(wowOutbound, `chain-${index + 1}`, `proxy-${index + 1}`);
        chains.push(chain);
    }

    const warpBestPing = await buildConfig(
        `💦 Warp${proIndicator}- Best Ping 🚀`,
        [...proxies, ...udpNoise],
        true,
        false,
        false,
        true,
        false,
        outboundDomains
    );

    const wowBestPing = await buildConfig(
        `💦 WoW${proIndicator}- Best Ping 🚀`,
        [...chains, ...proxies, ...udpNoise],
        true,
        true,
        false,
        true,
        false,
        outboundDomains
    );

    configs.push(warpBestPing, wowBestPing);

    return new Response(JSON.stringify(configs, null, 4), {
        status: 200,
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Cache-Control': 'no-store',
            'CDN-Cache-Control': 'no-store'
        }
    });
}

function modifyOutbound(outbound: Outbound, tag: string, dialerProxy?: string): Outbound {
    const newOutbound = structuredClone(outbound);
    newOutbound.tag = tag;

    if (dialerProxy && newOutbound.streamSettings) {
        newOutbound.streamSettings.sockopt.dialerProxy = dialerProxy;
    }

    return newOutbound;
}