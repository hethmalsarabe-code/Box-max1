// ============================================
// BPB PANEL - SING-BOX FULL CORE (COMPLETE ORIGINAL)
// Version: 4.1.3
// ============================================

import { getDataset } from 'kv';
import { buildDNS as buildDNSSB } from './dns';
import { buildRoutingRules as buildRoutingRulesSB } from './routing';
import { buildChainOutbound as buildChainOutboundSB, buildUrlTest as buildUrlTestSB, buildWarpOutbound as buildWarpOutboundSB, buildWebsocketOutbound as buildWebsocketOutboundSB } from './outbounds.js';
import { Outbound, WireguardEndpoint, Config } from 'types/sing-box';
import { getConfigAddresses, generateRemark, isHttps, getProtocols } from '@utils';
import { buildMixedInbound as buildMixedInboundSB, tun } from './inbounds';

async function buildConfig(
    outbounds: Outbound[],
    endpoints: WireguardEndpoint[],
    selectorTags: string[],
    urlTestTags: string[],
    secondUrlTestTags: string[],
    isWarp: boolean,
    isChain: boolean
): Promise<Config> {
    const { logLevel } = globalThis.settings;

    const config: Config = {
        log: {
            disabled: logLevel === "none",
            level: logLevel === "none" ? undefined : logLevel === "warning" ? "warn" : logLevel,
            timestamp: true
        },
        dns: await buildDNSSB(isWarp, isChain),
        inbounds: [
            tun,
            buildMixedInboundSB()
        ],
        outbounds: [
            ...outbounds,
            {
                type: "selector",
                tag: "✅ Selector",
                outbounds: selectorTags,
                interrupt_exist_connections: false
            },
            {
                type: "direct",
                tag: "direct"
            }
        ],
        endpoints: endpoints.omitEmpty(),
        route: buildRoutingRulesSB(isWarp, isChain),
        ntp: {
            enabled: true,
            server: "time.cloudflare.com",
            server_port: 123,
            domain_resolver: "dns-direct",
            interval: "30m",
            write_to_system: false
        },
        experimental: {
            cache_file: {
                enabled: true,
                store_fakeip: true
            },
            clash_api: {
                external_controller: "127.0.0.1:9090",
                external_ui: "ui",
                default_mode: "Rule",
                external_ui_download_url: "https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
                external_ui_download_detour: "direct"
            }
        }
    };

    const tag = isWarp ? `💦 Warp - Best Ping 🚀` : "💦 Best Ping 🚀";
    const mainUrlTest = buildUrlTestSB(tag, urlTestTags, isWarp);
    config.outbounds.push(mainUrlTest);
    if (isWarp) config.outbounds.push(buildUrlTestSB("💦 WoW - Best Ping 🚀", secondUrlTestTags, isWarp));
    if (isChain) config.outbounds.push(buildUrlTestSB("💦 🔗 Best Ping 🚀", secondUrlTestTags, isWarp));

    return config;
}

export async function getSbCustomConfig(isFragment: boolean): Promise<Response> {
    const { outProxy, ports } = globalThis.settings;
    const chainProxy = outProxy ? buildChainOutboundSB() : undefined;
    const isChain = !!chainProxy;

    const proxyTags: string[] = [];
    const chainTags: string[] = [];
    const outbounds: Outbound[] = [];

    const protocols = getProtocols();
    const Addresses = await getConfigAddresses(isFragment);
    const totalPorts = ports.filter(port => !isFragment || isHttps(port));
    const selectorTags = ["💦 Best Ping 🚀"].concatIf(isChain, "💦 🔗 Best Ping 🚀");

    protocols.forEach(protocol => {
        let protocolIndex = 1;
        totalPorts.forEach(port => {
            Addresses.forEach(addr => {
                const tag = generateRemark(protocolIndex, port, addr, protocol, isFragment, false);
                const outbound = buildWebsocketOutboundSB(protocol, tag, addr, port, isFragment);

                outbounds.push(outbound);
                proxyTags.push(tag);
                selectorTags.push(tag);

                if (isChain) {
                    const chainTag = generateRemark(protocolIndex, port, addr, protocol, isFragment, true);
                    const chain = structuredClone(chainProxy);
                    chain.tag = chainTag;
                    chain.detour = tag;
                    outbounds.push(chain);

                    chainTags.push(chainTag);
                    selectorTags.push(chainTag);
                }

                protocolIndex++;
            });
        });
    });

    const config = await buildConfig(
        outbounds,
        [],
        selectorTags,
        proxyTags,
        chainTags,
        false,
        isChain
    );

    return new Response(JSON.stringify(config, null, 4), {
        status: 200,
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Cache-Control': 'no-store',
            'CDN-Cache-Control': 'no-store'
        }
    });
}

export async function getSbWarpConfig(request: Request, env: Env): Promise<Response> {
    const { warpEndpoints } = globalThis.settings;
    const { warpAccounts } = await getDataset(request, env);

    const proxyTags: string[] = [];
    const chainTags: string[] = [];
    const outbounds: WireguardEndpoint[] = [];
    const selectorTags = [
        "💦 Warp - Best Ping 🚀",
        "💦 WoW - Best Ping 🚀"
    ];

    warpEndpoints.forEach((endpoint, index) => {
        const warpTag = `💦 ${index + 1} - Warp 🇮🇷`;
        proxyTags.push(warpTag);

        const wowTag = `💦 ${index + 1} - WoW 🌍`;
        chainTags.push(wowTag);

        selectorTags.push(warpTag, wowTag);
        const warpOutbound = buildWarpOutboundSB(warpAccounts[0], warpTag, endpoint);
        const wowOutbound = buildWarpOutboundSB(warpAccounts[1], wowTag, endpoint, warpTag);
        outbounds.push(warpOutbound, wowOutbound);
    });

    const config = await buildConfig(
        [],
        outbounds,
        selectorTags,
        proxyTags,
        chainTags,
        true,
        false
    );

    return new Response(JSON.stringify(config, null, 4), {
        status: 200,
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Cache-Control': 'no-store',
            'CDN-Cache-Control': 'no-store'
        }
    });
}

// ===== SECOND FILE: DNS =====

import { getGeoAssets as getGeoAssetsSB } from './geo-assets';
import { DNS, DnsRule, DnsServer } from 'types/sing-box';
import { isDomain, getDomain, accDnsRules } from '@utils';

export async function buildDNS(isWarp: boolean, isChain: boolean): Promise<DNS> {
    const {
        localDNS,
        remoteDNS,
        warpRemoteDNS,
        antiSanctionDNS,
        outProxyParams,
        remoteDnsHost,
        enableIPv6,
        fakeDNS,
        enableECH,
        echServerName
    } = globalThis.settings;

    const url = new URL(remoteDNS);
    const protocol = url.protocol.replace(':', '');
    const servers: DnsServer[] = [
        {
            type: isWarp ? "udp" : protocol,
            server: isWarp ? warpRemoteDNS : remoteDnsHost.host,
            detour: isWarp ? "💦 Warp - Best Ping 🚀" : isChain ? "💦 Best Ping 🚀" : "✅ Selector",
            tag: "dns-remote"
        }
    ];

    if (localDNS === 'localhost') {
        addDnsServer(servers, "local", "dns-direct", undefined, undefined, undefined);
    } else {
        addDnsServer(servers, "udp", "dns-direct", localDNS, undefined, undefined);
    }

    const rules: DnsRule[] = [
        {
            clash_mode: "Direct",
            server: "dns-direct"
        },
        {
            clash_mode: "Global",
            server: "dns-remote"
        }
    ];

    if (enableECH) {
        const { hostName } = globalThis.httpConfig;
        addDnsRule(rules, 'dns-direct', undefined, undefined, undefined, [echServerName || hostName], ["HTTPS"]);
    }

    if (isChain && !isWarp) {
        const { server } = outProxyParams;
        if (isDomain(server)) rules.push({
            domain: server,
            server: "dns-remote"
        });
    }

    if (remoteDnsHost.isDomain && !isWarp) {
        const { ipv4, ipv6, host } = remoteDnsHost;
        const predefined = ipv4.concatIf(enableIPv6, ipv6);
        addDnsServer(servers, "hosts", "hosts", undefined, undefined, undefined, host, predefined);
        rules.unshift({
            ip_accept_any: true,
            server: "hosts"
        });
    }

    const assets = getGeoAssetsSB();
    const dnsRules = accDnsRules(assets);

    const blockDomains = [
        ...dnsRules.block.geosites,
        ...dnsRules.block.domains
    ];

    if (blockDomains.length) {
        addDnsRule(
            rules,
            'reject',
            undefined,
            dnsRules.block.geosites,
            undefined, 
            dnsRules.block.domains
        );
    }

    dnsRules.bypass.localDNS.geositeGeoips.forEach(({ geosite, geoip }) => {
        addDnsRule(
            rules,
            'dns-direct',
            undefined,
            [geosite], 
            geoip,
            undefined
        );
    });

    const bypassDomains = [
        ...dnsRules.bypass.localDNS.geosites,
        ...dnsRules.bypass.localDNS.domains
    ];

    if (bypassDomains.length) {
        addDnsRule(
            rules,
            'dns-direct',
            undefined,
            dnsRules.bypass.localDNS.geosites,
            undefined,
            dnsRules.bypass.localDNS.domains
        );
    }

    const sanctionDomains = [
        ...dnsRules.bypass.antiSanctionDNS.geosites,
        ...dnsRules.bypass.antiSanctionDNS.domains
    ];

    if (sanctionDomains.length) {
        const dnsHost = getDomain(antiSanctionDNS);
        addDnsRule(
            rules,
            'dns-anti-sanction',
            undefined,
            dnsRules.bypass.antiSanctionDNS.geosites,
            undefined,
            dnsRules.bypass.antiSanctionDNS.domains
        );

        if (dnsHost.isHostDomain) {
            addDnsServer(servers, "https", "dns-anti-sanction", dnsHost.host, undefined, "dns-direct");
        } else {
            addDnsServer(servers, "udp", "dns-anti-sanction", antiSanctionDNS, undefined, undefined);
        }
    }

    if (fakeDNS) {
        addDnsServer(
            servers,
            "fakeip",
            "dns-fake",
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            "198.18.0.0/15",
            enableIPv6 ? "fc00::/18" : undefined
        );

        addDnsRule(rules, "dns-fake", "tun-in", undefined, undefined, undefined, ["A", "AAAA"]);
    }

    return {
        servers,
        rules,
        strategy: enableIPv6 ? "prefer_ipv4" : "ipv4_only",
        independent_cache: true
    }
}

function addDnsServer(
    servers: DnsServer[],
    type: string,
    tag: string,
    server?: string,
    detour?: string,
    domain_resolver?: string,
    host?: string,
    predefined?: string[],
    inet4_range?: string,
    inet6_range?: string
) {
    servers.push({
        type,
        server,
        detour,
        domain_resolver: domain_resolver ? {
            server: domain_resolver,
            strategy: "ipv4_only"
        } : undefined,
        predefined: host ? { [host]: predefined } : undefined,
        inet4_range,
        inet6_range,
        tag
    });
}

function addDnsRule(
    rules: DnsRule[],
    dns: string,
    inbound?: string,
    geosite?: string[],
    geoip?: string,
    domain?: string[],
    query_type?: Array<"A" | "AAAA" | "HTTPS">
) {
    const isPair = geosite && geoip;
    rules.push({
        inbound,
        type: isPair ? 'logical' : undefined,
        mode: isPair ? 'and' : undefined,
        rules: isPair ? [
            { rule_set: geosite }, 
            { rule_set: geoip }
        ] : undefined,
        rule_set: geosite?.length && !geoip ? geosite : undefined,
        domain_suffix: domain?.omitEmpty(),
        query_type,
        action: dns === 'reject' ? 'reject' : 'route',
        server: dns === 'reject' ? undefined : dns
    });
}

// ===== THIRD FILE: GEO ASSETS =====

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
        {
            rule: blockMalware,
            type: 'block',
            geosite: "geosite-malware",
            geoip: "geoip-malware",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-malware.srs",
            geoipURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geoip-malware.srs"
        },
        {
            rule: blockPhishing,
            type: 'block',
            geosite: "geosite-phishing",
            geoip: "geoip-phishing",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-phishing.srs",
            geoipURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geoip-phishing.srs"
        },
        {
            rule: blockCryptominers,
            type: 'block',
            geosite: "geosite-cryptominers",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-cryptominers.srs",
        },
        {
            rule: blockAds,
            type: 'block',
            geosite: "geosite-category-ads-all",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-category-ads-all.srs",
        },
        {
            rule: blockPorn,
            type: 'block',
            geosite: "geosite-nsfw",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-nsfw.srs",
        },
        {
            rule: bypassIran,
            type: 'direct',
            dns: localDNS,
            geosite: "geosite-ir",
            geoip: "geoip-ir",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-ir.srs",
            geoipURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geoip-ir.srs"
        },
        {
            rule: bypassChina,
            type: 'direct',
            dns: localDNS,
            geosite: "geosite-cn",
            geoip: "geoip-cn",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-cn.srs",
            geoipURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geoip-cn.srs"
        },
        {
            rule: bypassRussia,
            type: 'direct',
            dns: localDNS,
            geosite: "geosite-category-ru",
            geoip: "geoip-ru",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-category-ru.srs",
            geoipURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geoip-ru.srs"
        },
        {
            rule: bypassOpenAi,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-openai",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-openai.srs"
        },
        {
            rule: bypassGoogleAi,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-google-deepmind",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-google-deepmind.srs"
        },
        {
            rule: bypassMicrosoft,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-microsoft",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-microsoft.srs"
        },
        {
            rule: bypassOracle,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-oracle",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-oracle.srs"
        },
        {
            rule: bypassDocker,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-docker",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-docker.srs"
        },
        {
            rule: bypassAdobe,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-adobe",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-adobe.srs"
        },
        {
            rule: bypassEpicGames,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-epicgames",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-epicgames.srs"
        },
        {
            rule: bypassIntel,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-intel",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-intel.srs"
        },
        {
            rule: bypassAmd,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-amd",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-amd.srs"
        },
        {
            rule: bypassNvidia,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-nvidia",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-nvidia.srs"
        },
        {
            rule: bypassAsus,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-asus",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-asus.srs"
        },
        {
            rule: bypassHp,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-hp",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-hp.srs"
        },
        {
            rule: bypassLenovo,
            type: 'direct',
            dns: antiSanctionDNS,
            geosite: "geosite-lenovo",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-lenovo.srs"
        },
    ].filter(({ rule }) => rule);
}

// ===== FOURTH FILE: INBOUNDS =====

import { MixedInbound, TunInbound } from "types/sing-box";

export const tun: TunInbound = {
    type: "tun",
    tag: "tun-in",
    address: ["172.19.0.1/28"],
    mtu: 9000,
    auto_route: true,
    strict_route: true,
    stack: "mixed"
}

export function buildMixedInbound(): MixedInbound {
    const { allowLANConnection } = globalThis.settings;
    return {
        type: "mixed",
        tag: "mixed-in",
        listen: allowLANConnection ? "0.0.0.0" : "127.0.0.1",
        listen_port: 2080
    };
}

// ===== FIFTH FILE: OUTBOUNDS =====

import {
    isHttps,
    base64ToDecimal,
    generateWsPath,
    parseHostPort,
    selectSniHost
} from '@utils';

import {
    BaseOutbound,
    HttpOutbound,
    SocksOutbound,
    ShadowsocksOutbound,
    VlessOutbound,
    TrojanOutbound,
    WireguardEndpoint,
    VmessOutbound,
    HttpTransport,
    WsTransport,
    GrpcTransport,
    TLS,
    Transport,
    HttpupgradeTransport,
    TransportType,
    Fingerprint,
    URLTest,
    ChainOutbound
} from 'types/sing-box';

function buildOutbound<T>(
    tag: string,
    type: string,
    server: string,
    server_port: number,
    tcp_fast_open: boolean,
    fields: Omit<T, keyof BaseOutbound>,
    tls?: TLS,
    transport?: Transport
): T {
    return {
        tag,
        type,
        server,
        server_port,
        tcp_fast_open,
        ...fields,
        tls,
        transport
    } as T;
}

export function buildWebsocketOutbound(
    protocol: string,
    remark: string,
    address: string,
    port: number,
    isFragment: boolean
): VlessOutbound | TrojanOutbound {
    const {
        dict: { _VL_ },
        globalConfig: { userID, TrPass },
        settings: { fingerprint, enableTFO, enableECH, echServerName }
    } = globalThis;

    const { host, sni, allowInsecure } = selectSniHost(address);
    const transport = buildTransport("ws", "none", generateWsPath(protocol), host, undefined, 2560);
    const tls = isHttps(port)
        ? buildTLS(
            "tls",
            isFragment,
            allowInsecure,
            sni,
            enableECH && !isFragment,
            echServerName || undefined,
            "http/1.1",
            fingerprint
        ) : undefined;

    if (protocol === _VL_) return buildOutbound<VlessOutbound>(remark, protocol, address, port, enableTFO, {
        uuid: userID,
        packet_encoding: "",
        network: "tcp"
    }, tls, transport);

    return buildOutbound<TrojanOutbound>(remark, protocol, address, port, enableTFO, {
        password: TrPass,
        network: "tcp"
    }, tls, transport);
}

export function buildWarpOutbound(
    warpAccount: WarpAccount,
    remark: string,
    endpoint: string,
    chain?: string
): WireguardEndpoint {
    const { host, port } = parseHostPort(endpoint, false);
    const {
        warpIPv6,
        reserved,
        publicKey,
        privateKey
    } = warpAccount;

    return {
        tag: remark,
        detour: chain || undefined,
        type: "wireguard",
        address: [
            "172.16.0.2/32",
            warpIPv6
        ],
        mtu: 1280,
        peers: [
            {
                address: chain ? "162.159.192.1" : host,
                port: chain ? 2408 : port,
                public_key: publicKey,
                reserved: base64ToDecimal(reserved),
                allowed_ips: [
                    "0.0.0.0/0",
                    "::/0"
                ],
                persistent_keepalive_interval: 5
            }
        ],
        private_key: privateKey
    } satisfies WireguardEndpoint;
}

export function buildChainOutbound(): ChainOutbound | undefined {
    const {
        dict: { _VL_, _TR_, _SS_, _VM_ },
        settings: {
            outProxy,
            outProxyParams: {
                protocol, server, port, user,
                pass, password, method, uuid,
                flow, security, type, sni, fp,
                host, path, alpn, pbk, sid,
                headerType, serviceName, aid
            }
        }
    } = globalThis;

    const { searchParams } = new URL(outProxy);
    const ed = searchParams.get("ed");
    const earlyData = ed ? +ed : undefined;

    const tls = buildTLS(security, false, false, sni || server, false, undefined, alpn, fp, pbk, sid);
    const transport = buildTransport(type, headerType, path, host, serviceName, earlyData);

    switch (protocol) {
        case "http":
            return buildOutbound<HttpOutbound>("", protocol, server, port, false, {
                username: user,
                password: pass
            });

        case "socks":
            return buildOutbound<SocksOutbound>("", protocol, server, port, false, {
                username: user,
                password: pass,
                version: "5",
                network: "tcp"
            });

        case _SS_:
            return buildOutbound<ShadowsocksOutbound>("", protocol, server, port, false, {
                method,
                password,
                network: "tcp"
            });

        case _VL_:
            return buildOutbound<VlessOutbound>("", protocol, server, port, false, {
                uuid,
                flow,
                network: "tcp"
            }, tls, transport);

        case _VM_:
            return buildOutbound<VmessOutbound>("", protocol, server, port, false, {
                uuid: uuid,
                security: "auto",
                alter_id: aid,
                network: "tcp"
            }, tls, transport);

        case _TR_:
            return buildOutbound<TrojanOutbound>("", protocol, server, port, false, {
                password: password,
                network: "tcp"
            }, tls, transport);

        default:
            return undefined;
    };
}

export function buildUrlTest(
    tag: string,
    outboundTags: string[],
    isWarp: boolean
): URLTest {
    const { bestWarpInterval, bestVLTRInterval } = globalThis.settings;
    return {
        type: "urltest",
        tag,
        outbounds: outboundTags,
        url: "https://www.gstatic.com/generate_204",
        interrupt_exist_connections: false,
        interval: isWarp ? `${bestWarpInterval}s` : `${bestVLTRInterval}s`
    };
}

function buildTLS(
    security: "tls" | "reality" | "none",
    isFragment: boolean,
    allowInsecure: boolean,
    sni: string,
    enableECH: boolean,
    echServerName?: string,
    alpn?: string,
    fingerprint?: Fingerprint,
    publicKey?: string,
    shortID?: string
): TLS | undefined {
    if (!["tls", "reality"].includes(security)) return undefined;
    const tlsAlpns = alpn?.split(',').filter(value => value !== 'h2');

    const tls: TLS = {
        enabled: true,
        server_name: sni,
        record_fragment: isFragment,
        insecure: allowInsecure,
        alpn: tlsAlpns,
        utls: {
            enabled: !!fingerprint,
            fingerprint: fingerprint
        },
        ech: enableECH ? {
            enabled: true,
            query_server_name: echServerName
        } : undefined
    };

    if (security === "tls") return tls;
    if (security === 'reality' && publicKey && shortID) return {
        ...tls,
        reality: {
            enabled: true,
            public_key: publicKey,
            short_id: shortID
        }
    };
}

// function echBase64ToPEM(config: string) {
//     const clean = config.replace(/\s+/g, "");
//     const lines: string[] = [];

//     for (let i = 0; i < clean.length; i += 64) {
//         lines.push(clean.slice(i, i + 64));
//     }

//     return [
//         "-----BEGIN ECH CONFIGS-----",
//         ...lines,
//         "-----END ECH CONFIGS-----",
//     ].join("\n");
// }

function buildTransport(
    type: TransportType,
    headerType?: "http" | "none",
    path: string = "/",
    host?: string,
    serviceName?: string,
    earlyData?: number
): Transport | undefined {
    path = path?.split("?")[0];

    switch (type) {
        case 'tcp':
            if (headerType === 'http') return {
                type: "http",
                host: host?.split(','),
                path: path,
                method: "GET",
                headers: {
                    "Connection": ["keep-alive"],
                    "Content-Type": ["application/octet-stream"]
                },
            } satisfies HttpTransport;

            return undefined;

        case 'ws':
            return {
                type: "ws",
                path: path?.split('?ed=')[0],
                max_early_data: earlyData,
                early_data_header_name: earlyData ? "Sec-WebSocket-Protocol" : undefined,
                headers: {
                    Host: host
                }
            } satisfies WsTransport;

        case 'httpupgrade':
            return {
                type: "httpupgrade",
                host: host,
                path: path?.split('?ed=')[0]
            } satisfies HttpupgradeTransport;

        case 'grpc':
            return {
                type: "grpc",
                service_name: serviceName
            } satisfies GrpcTransport;

        default:
            return undefined;
    }
}

// ===== SIXTH FILE: ROUTING =====

import { getGeoAssets as getGeoAssetsRouting } from './geo-assets';
import { accRoutingRules } from '@utils';
import { Route, RoutingRule, RuleSet } from 'types/sing-box';

export function buildRoutingRules(isWarp: boolean, isChain: boolean): Route {
    const { blockUDP443, enableIPv6 } = globalThis.settings;

    const rules: RoutingRule[] = [
        {
            ip_cidr: "172.19.0.2",
            action: "hijack-dns"
        },
        {
            clash_mode: "Direct",
            outbound: "direct"
        },
        {
            clash_mode: "Global",
            outbound: "✅ Selector"
        },
        {
            action: "sniff"
        },
        {
            protocol: "dns",
            action: "hijack-dns"
        },
        {
            ip_is_private: true,
            outbound: "direct"
        }
    ];

    if (!isWarp) {
        addRoutingRule(rules, 'reject', undefined, undefined, undefined, undefined, "udp");
    } else if (blockUDP443) {
        addRoutingRule(rules, 'reject', undefined, undefined, undefined, undefined, "udp", "quic", 443);
    }

    const geoAssets = getGeoAssetsRouting();
    const routingRules = accRoutingRules(geoAssets);

    const blockDomains = [
        ...routingRules.block.geosites,
        ...routingRules.block.domains
    ];

    if (blockDomains.length) {
        addRoutingRule(rules, 'reject', routingRules.block.domains, undefined, routingRules.block.geosites);
    }

    const blockIPs = [
        ...routingRules.block.geoips,
        ...routingRules.block.ips
    ];

    if (blockIPs.length) {
        addRoutingRule(rules, 'reject', undefined, routingRules.block.ips, undefined, routingRules.block.geoips);
    }

    const bypassDomains = [
        ...routingRules.bypass.geosites,
        ...routingRules.bypass.domains
    ];

    if (bypassDomains.length) {
        addRoutingRule(rules, 'direct', routingRules.bypass.domains, undefined, routingRules.bypass.geosites);
    }

    const bypassIPs = [
        ...routingRules.bypass.geoips,
        ...routingRules.bypass.ips
    ];

    if (bypassIPs.length) {
        addRoutingRule(rules, 'direct', undefined, routingRules.bypass.ips, undefined, routingRules.bypass.geoips);
    }

    const strategy = enableIPv6 ? "prefer_ipv4" : "ipv4_only";
    const ruleSets: RuleSet[] = geoAssets.reduce((sets, asset) => {
        addRuleSets(sets, asset);
        return sets;
    }, []);

    return {
        rules,
        rule_set: ruleSets.omitEmpty(),
        auto_detect_interface: true,
        default_domain_resolver: {
            server: "dns-direct",
            strategy,
            rewrite_ttl: 60
        },
        final: "✅ Selector"
    };
}

function addRoutingRule(
    rules: RoutingRule[],
    type: 'direct' | 'reject' | 'route',
    domain?: string[],
    ip?: string[],
    geosite?: string[],
    geoip?: string[],
    network?: "tcp" | "udp",
    protocol?: "http" | "tls" | "quic" | "dns",
    port?: number
) {
    rules.push({
        rule_set: geosite || geoip,
        domain_suffix: domain?.length ? domain : undefined,
        ip_cidr: ip?.length ? ip : undefined,
        network,
        protocol,
        port,
        action: type === 'reject' ? 'reject' : 'route',
        outbound: type === 'direct' ? 'direct' : undefined
    });
}

function addRuleSets(ruleSets: RuleSet[], geoAsset: GeoAsset) {
    const { geosite, geositeURL, geoip, geoipURL } = geoAsset;

    const addRuleSet = (geo: string, url: string) => ruleSets.push({
        type: "remote",
        tag: geo,
        format: "binary",
        url,
        download_detour: "direct"
    });

    if (geosite && geositeURL) addRuleSet(geosite, geositeURL);
    if (geoip && geoipURL) addRuleSet(geoip, geoipURL);
}