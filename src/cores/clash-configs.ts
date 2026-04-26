// ============================================
// BPB PANEL - CLASH FULL CORE (COMPLETE ORIGINAL)
// Version: 4.1.3
// ============================================

import { getDataset } from 'kv';
import { buildDNS as buildDNSClash } from './dns';
import { buildRoutingRules as buildRoutingRulesClash, buildRuleProviders as buildRuleProvidersClash } from './routing';
import { buildChainOutbound as buildChainOutboundClash, buildUrlTest as buildUrlTestClash, buildWarpOutbound as buildWarpOutboundClash, buildWebsocketOutbound as buildWebsocketOutboundClash } from './outbounds';
import type { WireguardOutbound, Config, Outbound } from 'types/clash';
import { getConfigAddresses, generateRemark, getProtocols } from '@utils';
import { sniffer, tun } from './inbounds';

async function buildConfig(
    outbounds: Outbound[],
    selectorTags: string[],
    proxyTags: string[],
    chainTags: string[],
    isChain: boolean,
    isWarp: boolean,
    isPro: boolean
): Promise<Config> {
    const { logLevel, allowLANConnection } = globalThis.settings;
    const tcpSettings = isWarp ? {} : {
        "disable-keep-alive": false,
        "keep-alive-idle": 10,
        "keep-alive-interval": 15,
        "tcp-concurrent": true
    };

    const config: Config = {
        "mixed-port": 7890,
        "ipv6": true,
        "allow-lan": allowLANConnection,
        "unified-delay": false,
        "log-level": logLevel.replace("none", "silent"),
        "mode": "rule",
        ...tcpSettings,
        "geo-auto-update": true,
        "geo-update-interval": 168,
        "external-controller": "127.0.0.1:9090",
        "external-controller-cors": {
            "allow-origins": ["*"],
            "allow-private-network": true
        },
        "external-ui": "ui",
        "external-ui-url": "https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
        "profile": {
            "store-selected": true,
            "store-fake-ip": true
        },
        "dns": await buildDNSClash(isChain, isWarp, isPro),
        "tun": tun,
        "sniffer": sniffer,
        "proxies": outbounds,
        "proxy-groups": [
            {
                "name": "✅ Selector",
                "type": "select",
                "proxies": selectorTags
            }
        ],
        "rule-providers": buildRuleProvidersClash(),
        "rules": buildRoutingRulesClash(isWarp),
        "ntp": {
            "enable": true,
            "server": "time.cloudflare.com",
            "port": 123,
            "interval": 30
        }
    };

    const name = isWarp ? `💦 Warp ${isPro ? "Pro " : ""}- Best Ping 🚀` : "💦 Best Ping 🚀";
    const mainUrlTest = buildUrlTestClash(name, proxyTags, isWarp);
    config["proxy-groups"].push(mainUrlTest);
    if (isWarp) config["proxy-groups"].push(buildUrlTestClash(`💦 WoW ${isPro ? "Pro " : ""}- Best Ping 🚀`, chainTags, isWarp));
    if (isChain) config["proxy-groups"].push(buildUrlTestClash("💦 🔗 Best Ping 🚀", chainTags, isWarp));

    return config;
}

export async function getClNormalConfig(): Promise<Response> {
    const { outProxy, ports } = globalThis.settings;
    const chainProxy = outProxy ? buildChainOutboundClash() : undefined;
    const isChain = !!chainProxy;

    const proxyTags: string[] = [];
    const chainTags: string[] = [];
    const outbounds: Outbound[] = [];

    const Addresses = await getConfigAddresses(false);
    const protocols = getProtocols();
    const selectorTags = ["💦 Best Ping 🚀"].concatIf(isChain, "💦 🔗 Best Ping 🚀");

    protocols.forEach(protocol => {
        let protocolIndex = 1;
        ports.forEach(port => {
            Addresses.forEach(addr => {
                const tag = generateRemark(protocolIndex, port, addr, protocol, false, false);
                const outbound = buildWebsocketOutboundClash(protocol, tag, addr, port);

                if (outbound) {
                    proxyTags.push(tag);
                    selectorTags.push(tag);
                    outbounds.push(outbound);

                    if (isChain) {
                        const chainTag = generateRemark(protocolIndex, port, addr, protocol, false, true);
                        let chain = structuredClone(chainProxy);
                        chain['name'] = chainTag;
                        chain['dialer-proxy'] = tag;
                        outbounds.push(chain);

                        chainTags.push(chainTag);
                        selectorTags.push(chainTag);
                    }

                    protocolIndex++;
                }
            });
        });
    });

    const config = await buildConfig(
        outbounds,
        selectorTags,
        proxyTags,
        chainTags,
        isChain,
        false,
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

export async function getClWarpConfig(request: Request, env: Env, isPro: boolean): Promise<Response> {
    const { warpEndpoints } = globalThis.settings;
    const { warpAccounts } = await getDataset(request, env);

    const proxyTags: string[] = [];
    const chainTags: string[] = [];
    const outbounds: WireguardOutbound[] = [];
    const proSign = isPro ? "Pro " : "";
    const selectorTags = [
        `💦 Warp ${proSign}- Best Ping 🚀`,
        `💦 WoW ${proSign}- Best Ping 🚀`
    ];

    warpEndpoints.forEach((endpoint, index) => {
        const warpTag = `💦 ${index + 1} - Warp ${proSign}🇮🇷`;
        proxyTags.push(warpTag);

        const wowTag = `💦 ${index + 1} - WoW ${proSign}🌍`;
        chainTags.push(wowTag);

        selectorTags.push(warpTag, wowTag);
        const warpOutbound = buildWarpOutboundClash(warpAccounts[0], warpTag, endpoint, '', isPro);
        const wowOutbound = buildWarpOutboundClash(warpAccounts[1], wowTag, endpoint, warpTag, false);
        outbounds.push(warpOutbound, wowOutbound);
    });

    const config = await buildConfig(
        outbounds,
        selectorTags,
        proxyTags,
        chainTags,
        false,
        true,
        isPro
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

import { getGeoAssets as getGeoAssetsClash } from './geo-assets';
import { DNS, DnsHosts, FakeDNS } from 'types/clash';
import { isDomain, getDomain, accDnsRules } from '@utils';

export async function buildDNS(isChain: boolean, isWarp: boolean, isPro: boolean): Promise<DNS> {
    const {
        localDNS,
        remoteDNS,
        warpRemoteDNS,
        antiSanctionDNS,
        outProxyParams,
        remoteDnsHost,
        enableIPv6,
        fakeDNS,
        allowLANConnection
    } = globalThis.settings;

    const finalLocalDNS = localDNS === 'localhost' ? 'system' : `${localDNS}#DIRECT`;
    const proSign = isPro ? "Pro " : "";
    const remoteDnsDetour = isWarp
        ? `💦 Warp ${proSign}- Best Ping 🚀`
        : isChain ? "💦 Best Ping 🚀" : "✅ Selector";

    const finalRemoteDNS = `${isWarp ? warpRemoteDNS : remoteDNS}#${remoteDnsDetour}`;
    const hosts: DnsHosts = {};
    const nameserverPolicy: Record<string, string> = {};

    if (isChain && !isWarp) {
        const { server } = outProxyParams;
        if (isDomain(server)) nameserverPolicy[server] = finalRemoteDNS;
    }

    if (remoteDnsHost.isDomain && !isWarp) {
        const { ipv4, ipv6, host } = remoteDnsHost;
        hosts[host] = ipv4.concatIf(enableIPv6, ipv6);
    }

    const geoAssets = getGeoAssetsClash();
    const dnsRules = accDnsRules(geoAssets);

    const blockDomains = [
        ...dnsRules.block.geosites.map(geosite => `rule-set:${geosite}`),
        ...dnsRules.block.domains.map(domain => `+.${domain}`)
    ];

    blockDomains.forEach(value => hosts[value] = "rcode://refused");

    const sanctionDomains = [
        ...dnsRules.bypass.antiSanctionDNS.geosites.map(geosite => `rule-set:${geosite}`),
        ...dnsRules.bypass.antiSanctionDNS.domains.map(domain => `+.${domain}`)
    ];

    const bypassDomains = [
        ...dnsRules.bypass.localDNS.geositeGeoips.map(({ geosite }) => `rule-set:${geosite}`),
        ...dnsRules.bypass.localDNS.geosites.map(geosite => `rule-set:${geosite}`),
        ...dnsRules.bypass.localDNS.domains.map(domain => `+.${domain}`)
    ];

    if (sanctionDomains.length) {
        sanctionDomains.forEach(value => nameserverPolicy[value] = `${antiSanctionDNS}#DIRECT`);
        const { host, isHostDomain } = getDomain(antiSanctionDNS);
        if (isHostDomain) bypassDomains.push(host);
    }

    bypassDomains.forEach(value => nameserverPolicy[value] = finalLocalDNS);
    const listen = `${allowLANConnection ? "0.0.0.0" : "127.0.0.1"}:1053`;
    let enhancedMode: "redir-host" | "fake-ip" = "redir-host";
    let fakeDnsSettings: Partial<FakeDNS> = {};
    
    if (fakeDNS) {
        enhancedMode = "fake-ip";
        fakeDnsSettings = {
            "fake-ip-range": "198.18.0.1/16",
            "fake-ip-filter-mode": "blacklist",
            "fake-ip-filter": ["+.lan", "+.local"]
        };
    }

    const dns: DNS = {
        "enable": true,
        "respect-rules": true,
        "use-system-hosts": false,
        "listen": listen,
        "ipv6": enableIPv6,
        "hosts": hosts.omitEmpty(),
        "nameserver": [finalRemoteDNS],
        "proxy-server-nameserver": [finalLocalDNS],
        "direct-nameserver": [finalLocalDNS],
        "direct-nameserver-follow-policy": true,
        "nameserver-policy": nameserverPolicy.omitEmpty(),
        "enhanced-mode": enhancedMode,
        ...fakeDnsSettings
    };

    return dns;
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
            format: "text",
            geosite: "malware",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/malware.txt",
            geoip: "malware-cidr",
            geoipURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/malware-ip.txt",
        },
        {
            rule: blockPhishing,
            type: 'block',
            format: "text",
            geosite: "phishing",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/phishing.txt",
            geoip: "phishing-cidr",
            geoipURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/phishing-ip.txt",
        },
        {
            rule: blockCryptominers,
            type: 'block',
            format: "text",
            geosite: "cryptominers",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/cryptominers.txt"
        },
        {
            rule: blockAds,
            type: 'block',
            format: "text",
            geosite: "category-ads-all",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/category-ads-all.txt"
        },
        {
            rule: blockPorn,
            type: 'block',
            format: "text",
            geosite: "nsfw",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/nsfw.txt",
        },
        {
            rule: bypassIran,
            type: 'direct',
            dns: localDNS,
            format: "text",
            geosite: "ir",
            geoip: "ir-cidr",
            geositeURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/ir.txt",
            geoipURL: "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/ircidr.txt"
        },
        {
            rule: bypassChina,
            type: 'direct',
            dns: localDNS,
            format: "yaml",
            geosite: "cn",
            geoip: "cn-cidr",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.yaml",
            geoipURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.yaml"
        },
        {
            rule: bypassRussia,
            type: 'direct',
            dns: localDNS,
            format: "yaml",
            geosite: "ru",
            geoip: "ru-cidr",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ru.yaml",
            geoipURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/ru.yaml"
        },
        {
            rule: bypassOpenAi,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "openai",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/openai.yaml"
        },
        {
            rule: bypassGoogleAi,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "googleai",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google-deepmind.yaml"
        },
        {
            rule: bypassMicrosoft,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "microsoft",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.yaml"
        },
        {
            rule: bypassOracle,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "oracle",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/oracle.yaml"
        },
        {
            rule: bypassDocker,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "docker",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/docker.yaml"
        },
        {
            rule: bypassAdobe,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "adobe",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/adobe.yaml"
        },
        {
            rule: bypassEpicGames,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "epicgames",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/epicgames.yaml"
        },
        {
            rule: bypassIntel,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "intel",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/intel.yaml"
        },
        {
            rule: bypassAmd,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "amd",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/amd.yaml"
        },
        {
            rule: bypassNvidia,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "nvidia",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/nvidia.yaml"
        },
        {
            rule: bypassAsus,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "asus",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/asus.yaml"
        },
        {
            rule: bypassHp,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "hp",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/hp.yaml"
        },
        {
            rule: bypassLenovo,
            type: 'direct',
            dns: antiSanctionDNS,
            format: "yaml",
            geosite: "lenovo",
            geositeURL: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/lenovo.yaml"
        }
    ].filter(({ rule }) => rule);
}

// ===== FOURTH FILE: INBOUNDS =====

import { Sniffer, Tun } from "types/clash";

export const tun: Tun = {
    "enable": true,
    "stack": "mixed",
    "auto-route": true,
    "strict-route": true,
    "auto-detect-interface": true,
    "dns-hijack": [
        "any:53",
        "tcp://any:53"
    ],
    "mtu": 9000
};

export const sniffer: Sniffer = {
    "enable": true,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "override-destination": true,
    "sniff": {
        "HTTP": {
            "ports": [80, 8080, 8880, 2052, 2082, 2086, 2095]
        },
        "TLS": {
            "ports": [443, 8443, 2053, 2083, 2087, 2096]
        }
    }
};

// ===== FIFTH FILE: OUTBOUNDS =====

import { isHttps, generateWsPath, parseHostPort, selectSniHost } from '@utils';
import {
    BaseOutbound,
    HttpOutbound,
    SocksOutbound,
    ShadowsocksOutbound,
    VlessOutbound,
    TrojanOutbound,
    WireguardOutbound,
    WsOpts,
    GrpcOpts,
    HttpOpts,
    VmessOutbound,
    TLS,
    Transport,
    AmneziaOpts,
    Network,
    Fingerprint,
    URLTest,
    ChainOutbound
} from 'types/clash';

function buildOutbound<T>(
    name: string,
    type: string,
    server: string,
    port: number,
    isIPv6: boolean,
    tfo: boolean,
    tls: Partial<TLS>,
    transport: Partial<Transport>,
    fields: Omit<T, keyof BaseOutbound | keyof TLS | keyof Transport>,
): T {
    return {
        "name": name,
        "type": type,
        "server": server.replace(/\[|\]/g, ''),
        "port": port,
        "ip-version": isIPv6 ? "ipv4-prefer" : "ipv4",
        "tfo": tfo,
        "udp": false,
        ...fields,
        ...tls,
        ...transport
    } as T;
}

export function buildWebsocketOutbound(
    protocol: string,
    remark: string,
    address: string,
    port: number,
): VlessOutbound | TrojanOutbound | null {
    const {
        dict: { _VL_, _TR_ },
        globalConfig: { userID, TrPass },
        settings: { fingerprint, enableTFO, enableIPv6, enableECH, echServerName }
    } = globalThis;

    const isTLS = isHttps(port);
    if (protocol === _TR_ && !isTLS) return null;
    const { host, sni, allowInsecure } = selectSniHost(address);

    const tls = isTLS ? buildTLS(
        protocol, 
        "tls", 
        allowInsecure, 
        sni, 
        enableECH, 
        echServerName || undefined, 
        "http/1.1", 
        fingerprint
    ) : {};
    
    const transport = buildTransport("ws", undefined, generateWsPath(protocol), host, undefined, 2560);

    if (protocol === _VL_) return buildOutbound<VlessOutbound>(remark, protocol, address, port, enableIPv6, enableTFO, tls, transport, {
        "uuid": userID,
        "packet-encoding": ""
    });

    return buildOutbound<TrojanOutbound>(remark, protocol, address, port, enableIPv6, enableTFO, tls, transport, {
        "password": TrPass
    });
}

export function buildWarpOutbound(
    warpAccount: WarpAccount,
    remark: string,
    endpoint: string,
    chain: string,
    isPro: boolean
): WireguardOutbound {
    const {
        amneziaNoiseCount,
        amneziaNoiseSizeMin,
        amneziaNoiseSizeMax,
        enableIPv6
    } = globalThis.settings;

    const { host, port } = parseHostPort(endpoint, false);
    const ipVersion = enableIPv6 ? "ipv4-prefer" : "ipv4";

    const {
        warpIPv6,
        reserved,
        publicKey,
        privateKey
    } = warpAccount;

    return {
        "name": remark,
        "type": "wireguard",
        "ip": "172.16.0.2/32",
        "ipv6": warpIPv6,
        "ip-version": ipVersion,
        "private-key": privateKey,
        "server": chain ? "162.159.192.1" : host,
        "port": chain ? 2408 : port,
        "public-key": publicKey,
        "allowed-ips": ["0.0.0.0/0", "::/0"],
        "reserved": reserved,
        "udp": true,
        "mtu": 1280,
        "dialer-proxy": chain || undefined,
        "amnezia-wg-option": isPro ? {
            "jc": amneziaNoiseCount,
            "jmin": amneziaNoiseSizeMin,
            "jmax": amneziaNoiseSizeMax
        } satisfies AmneziaOpts : undefined
    };
}

export function buildChainOutbound(): ChainOutbound | undefined {
    const {
        dict: { _SS_, _VL_, _TR_, _VM_ },
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

    const tls = buildTLS(protocol, security, false, sni || server, false, undefined, alpn, fp, pbk, sid);
    const transport = buildTransport(type, headerType, path, host, serviceName, earlyData);

    switch (protocol) {
        case "http":
            return buildOutbound<HttpOutbound>("", "http", server, port, false, false, {}, {}, {
                "username": user,
                "password": pass
            });

        case "socks":
            return buildOutbound<SocksOutbound>("", "socks5", server, port, false, false, {}, {}, {
                "username": user,
                "password": pass
            });

        case _SS_:
            return buildOutbound<ShadowsocksOutbound>("", "ss", server, port, false, false, {}, {}, {
                "cipher": method,
                "password": password
            });

        case _VL_:
            return buildOutbound<VlessOutbound>("", _VL_, server, port, false, false, tls, transport, {
                "uuid": uuid,
                "flow": flow
            });

        case _VM_:
            return buildOutbound<VmessOutbound>("", _VM_, server, port, false, false, tls, transport, {
                "uuid": uuid,
                "cipher": "auto",
                "alterId": aid
            });

        case _TR_:
            if (security === "none") return undefined;
            return buildOutbound<TrojanOutbound>("", _TR_, server, port, false, false, tls, transport, {
                "password": password
            });

        default:
            return undefined;
    };
}

export function buildUrlTest(
    name: string,
    proxies: string[],
    isWarp: boolean
): URLTest {
    const { bestWarpInterval, bestVLTRInterval } = globalThis.settings;
    return {
        "name": name,
        "type": "url-test",
        "proxies": proxies,
        "url": "https://www.gstatic.com/generate_204",
        "interval": isWarp ? bestWarpInterval : bestVLTRInterval,
        "tolerance": 50
    };
}

function buildTLS(
    protocol: string,
    security: "tls" | "reality" | "none",
    allowInsecure: boolean,
    sni: string,
    enableECH: boolean,
    echServerName?: string,
    alpn?: string,
    fingerprint?: Fingerprint,
    publicKey?: string,
    shortID?: string
): Partial<TLS> {
    if (!["tls", "reality"].includes(security)) return {};
    const { _TR_ } = globalThis.dict;

    const common: TLS = {
        "tls": true,
        [protocol === _TR_ ? "sni" : "servername"]: sni,
        "client-fingerprint": fingerprint === "randomized" ? "random" : fingerprint,
        "skip-cert-verify": allowInsecure
    };

    if (security === "tls") {
        return {
            ...common,
            "alpn": alpn?.split(','),
            "ech-opts": enableECH ? {
                "enable": true,
                "query-server-name": echServerName
            } : undefined
        };
    } else if (security === "reality" && publicKey && shortID) {
        return {
            ...common,
            "reality-opts": {
                "public-key": publicKey,
                "short-id": shortID
            }
        };
    } else return {};
}

function buildTransport(
    type: Network,
    headerType?: "http" | "none",
    path: string = "/",
    host?: string,
    serviceName?: string,
    earlyData?: number
): Partial<Transport> {
    path = path?.split("?")[0];

    switch (type) {
        case 'tcp':
            return headerType === 'http' ? {
                "network": "http",
                "http-opts": {
                    "method": "GET",
                    "path": path.split(','),
                    "headers": {
                        "Host": host?.split(","),
                        "Connection": ["keep-alive"],
                        "Content-Type": ["application/octet-stream"]
                    }
                } satisfies HttpOpts
            } : {
                "network": "tcp"
            } satisfies Transport;

        case 'ws':
            return {
                "network": "ws",
                "ws-opts": {
                    "path": path,
                    "max-early-data": earlyData,
                    "early-data-header-name": earlyData ? "Sec-WebSocket-Protocol" : undefined,
                    "headers": {
                        "Host": host
                    }
                } satisfies WsOpts
            };

        case 'httpupgrade':
            const { _V2_ } = globalThis.dict;
            return {
                "network": "ws",
                "ws-opts": {
                    [`${_V2_}-http-upgrade`]: true,
                    [`${_V2_}-http-upgrade-fast-open`]: true,
                    "path": path,
                    "headers": {
                        "Host": host
                    }
                } satisfies WsOpts
            };

        case 'grpc':
            return {
                "network": "grpc",
                "grpc-opts": {
                    "grpc-service-name": serviceName
                } satisfies GrpcOpts
            };

        default:
            return {};
    }
}

// ===== SIXTH FILE: ROUTING =====

import { RuleProvider } from 'types/clash';
import { getGeoAssets as getGeoAssetsRouting } from './geo-assets';
import { isIPv6, isIPv4, accRoutingRules } from '@utils';

export function buildRoutingRules(isWarp: boolean) {
    const { blockUDP443 } = globalThis.settings;
    const geoAssets = getGeoAssetsRouting();
    const routingRules = accRoutingRules(geoAssets);
    const rules = [`GEOIP,lan,DIRECT,no-resolve`];

    if (!isWarp) {
        rules.push("NETWORK,udp,REJECT");
    } else if (blockUDP443) {
        rules.push("AND,((NETWORK,udp),(DST-PORT,443)),REJECT");
    }

    return [
        ...rules,
        ...routingRules.block.geosites.map(geosite => `RULE-SET,${geosite},REJECT`),
        ...routingRules.block.domains.map(domain => `DOMAIN-SUFFIX,${domain},REJECT`),
        ...routingRules.block.geoips.map(geoip => `RULE-SET,${geoip},REJECT`),
        ...routingRules.block.ips.map(ip => buildIpCidrRule(ip, 'REJECT')),
        ...routingRules.bypass.geosites.map(geosite => `RULE-SET,${geosite},DIRECT`),
        ...routingRules.bypass.domains.map(domain => `DOMAIN-SUFFIX,${domain},DIRECT`),
        ...routingRules.bypass.geoips.map(geoip => `RULE-SET,${geoip},DIRECT`),
        ...routingRules.bypass.ips.map(ip => buildIpCidrRule(ip, 'DIRECT')),
        "MATCH,✅ Selector"
    ];
}

export function buildRuleProviders(): Record<string, RuleProvider> | undefined {
    const geoAssets = getGeoAssetsRouting();
    return geoAssets.reduce((providers, asset) => {
        addRuleProvider(providers, asset);
        return providers;
    }, {}).omitEmpty();
}

function addRuleProvider(
    ruleProviders: Record<string, RuleProvider>,
    ruleProvider: GeoAsset
) {
    const { geosite, geoip, geositeURL, geoipURL, format } = ruleProvider;
    const fileExtension = format === 'text' ? 'txt' : format;

    const defineProvider = (geo: string, behavior: 'domain' | 'ipcidr', url: string) => {
        ruleProviders[geo] = {
            type: "http",
            format: format!,
            behavior,
            path: `./ruleset/${geo}.${fileExtension}`,
            interval: 86400,
            url
        };
    };

    if (geosite && geositeURL) defineProvider(geosite, 'domain', geositeURL);
    if (geoip && geoipURL) defineProvider(geoip, 'ipcidr', geoipURL);
}

function buildIpCidrRule(ip: string, proxy: string) {
    ip = isIPv6(ip) ? ip.replace(/\[|\]/g, '') : ip;
    const cidr = ip.includes('/') ? '' : isIPv4(ip) ? '/32' : '/128';
    return `IP-CIDR,${ip}${cidr},${proxy}`;
}
