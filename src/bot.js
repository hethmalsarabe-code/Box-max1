// ============================================
// BPB PANEL - COMPLETE TELEGRAM BOT (FULLY INTEGRATED)
// Version: 4.1.3 - FULL BPB PANEL CONTROL
// CLOUDFLARE WORKERS OPTIMIZED - FULLY FUNCTIONAL
// ============================================

import { Telegraf, Markup } from 'telegraf';
import JSZip from 'jszip';

// ==================== التوكن ومعرف المالك ====================
const BOT_TOKEN = '8513010794:AAH9_FatomlJIIPbCBajnYuRhYy2BcqwBxY';
const OWNER_ID = 8311254462;

// ==================== بيئة Cloudflare Workers ====================
globalThis.btoa = (str) => Buffer.from(str).toString('base64');
globalThis.atob = (str) => Buffer.from(str, 'base64').toString();

// نظام تخزين مؤقت للجلسات (بديل session)
const userSessions = new Map();

// ==================== الإعدادات العامة ====================
globalThis.dict = {
    _VL_: 'vless',
    _VL_CAP_: 'VLESS',
    _VM_: 'vmess',
    _TR_: 'trojan',
    _TR_CAP_: 'TROJAN',
    _SS_: 'shadowsocks',
    _V2_: 'v2ray',
    _project_: 'BPB',
    _website_: 'https://github.com/bpb-panel',
    _public_proxy_ip_: 'bpb.yousef.isegaro.com'
};

// الإعدادات الأساسية
let settings = {
    targetServer: '185.159.82.148',
    port: 443,
    path: '/',
    host: '',
    sni: '',
    alpn: 'http/1.1',
    fingerprint: 'chrome',
    uuid: '4d9b6c2c-3f4b-4a1e-9c8d-7e2f1a3b5c7d',
    trojanPassword: 'BPB-Panel-2024',
    vmessAid: 0,
    vmessSecurity: 'auto',
    shadowsocksMethod: 'chacha20-ietf-poly1305',
    shadowsocksPassword: 'BPB-SS-2024',
    localDNS: '1.1.1.1',
    remoteDNS: 'https://cloudflare-dns.com/dns-query',
    warpRemoteDNS: 'https://1.1.1.1/dns-query',
    antiSanctionDNS: 'https://dns.google/dns-query',
    enableIPv6: false,
    fakeDNS: true,
    fragmentMode: 'off',
    fragmentPackets: 'tlshello',
    fragmentLengthMin: 1,
    fragmentLengthMax: 5,
    fragmentIntervalMin: 1,
    fragmentIntervalMax: 5,
    enableWarp: false,
    enableChain: false,
    chainProxy: '',
    enableECH: false,
    echServerName: '',
    warpEndpoints: ['162.159.192.1:2408', '162.159.193.1:2408'],
    warpPrivateKey: 'mPct+VrLk8F5sK9xH2jN7bR3dQ6wE8yU1iA4oF0gH=',
    warpPublicKey: 'bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=',
    warpIPv6: '2606:4700:110:8c1c:0:0:0:2/128',
    warpReserved: '1/2/3',
    logLevel: 'warning',
    allowLANConnection: false,
    blockUDP443: false,
    bestVLTRInterval: 300,
    bestWarpInterval: 180,
    amneziaNoiseCount: 15,
    amneziaNoiseSizeMin: 40,
    amneziaNoiseSizeMax: 70,
    bypassIran: true,
    bypassChina: false,
    bypassRussia: false,
    bypassOpenAi: true,
    bypassGoogleAi: true,
    bypassMicrosoft: true,
    bypassOracle: false,
    bypassDocker: true,
    bypassAdobe: true,
    bypassEpicGames: true,
    bypassIntel: false,
    bypassAmd: false,
    bypassNvidia: false,
    bypassAsus: false,
    bypassHp: false,
    bypassLenovo: false,
    blockAds: true,
    blockPorn: false,
    blockMalware: true,
    blockPhishing: true,
    blockCryptominers: true,
    ports: [80, 443, 8080, 8443, 2053, 2083, 2087, 2096],
    enableTFO: true,
    panelVersion: '4.1.3',
    proxyIPMode: 'proxyip',
    proxyIPs: [],
    prefixes: [],
    outProxy: '',
    outProxyParams: {},
    cleanIPs: [],
    customCdnAddrs: [],
    customCdnHost: '',
    customCdnSni: '',
    VLConfigs: true,
    TRConfigs: true,
    customBypassRules: [],
    customBlockRules: [],
    customBypassSanctionRules: [],
    xrayUdpNoises: [],
    knockerNoiseMode: 'quic',
    noiseCountMin: 10,
    noiseCountMax: 15,
    noiseSizeMin: 5,
    noiseSizeMax: 10,
    noiseDelayMin: 1,
    noiseDelayMax: 1
};

globalThis.globalConfig = {
    userID: settings.uuid,
    TrPass: settings.trojanPassword,
    pathName: '/',
    fallbackDomain: 'speed.cloudflare.com',
    dohURL: 'https://cloudflare-dns.com/dns-query'
};

globalThis.httpConfig = {
    panelVersion: '4.1.3',
    defaultHttpPorts: [80, 8080, 2052, 2082, 2086, 2095, 8880],
    defaultHttpsPorts: [443, 8443, 2053, 2083, 2087, 2096],
    hostName: 'bpb-panel.workers.dev',
    client: '',
    urlOrigin: 'https://bpb-panel.workers.dev',
    subPath: settings.uuid
};

// ==================== دوال المساعد (Utils) ====================

function isDomain(address) {
    if (!address) return false;
    const domainRegex = /^(?!-)(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,}$/;
    return domainRegex.test(address);
}

async function fetchDNSRecords(url, recordType) {
    try {
        const response = await fetch(url, { headers: { accept: 'application/dns-json' } });
        const data = await response.json();
        if (!data.Answer) return [];
        return data.Answer.filter(record => record.type === recordType).map(record => record.data);
    } catch (error) {
        throw new Error(`Failed to fetch DNS records: ${error.message}`);
    }
}

async function resolveDNS(domain, onlyIPv4 = false) {
    const dohBaseURL = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}`;
    try {
        const ipv4 = await fetchDNSRecords(`${dohBaseURL}&type=A`, 1);
        const ipv6 = onlyIPv4 ? [] : await fetchDNSRecords(`${dohBaseURL}&type=AAAA`, 28);
        return { ipv4, ipv6 };
    } catch (error) {
        throw new Error(`Error resolving DNS for ${domain}: ${error.message}`);
    }
}

function randomUpperCase(str) {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        result += Math.random() < 0.5 ? str[i].toUpperCase() : str[i];
    }
    return result;
}

function getRandomString(lengthMin, lengthMax) {
    let result = '';
    const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * (lengthMax - lengthMin + 1)) + lengthMin;
    for (let i = 0; i < length; i++) {
        result += charSet.charAt(Math.floor(Math.random() * charSet.length));
    }
    return result;
}

function generateWsPath(protocol) {
    const config = {
        junk: getRandomString(8, 16),
        protocol: protocol === 'vless' ? "vl" : "tr",
        mode: settings.proxyIPMode,
        panelIPs: settings.proxyIPMode === 'proxyip' ? settings.proxyIPs : settings.prefixes
    };
    return `/${btoa(JSON.stringify(config))}`;
}

function isIPv4(address) {
    const ipv4Pattern = /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
    return ipv4Pattern.test(address);
}

function isIPv6(address) {
    const ipv6Pattern = /^\[(?:(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,7}:|::(?:[a-fA-F0-9]{1,4}:){0,7}|(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}|(?:[a-fA-F0-9]{1,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}|(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}|(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}|[a-fA-F0-9]{1,4}:(?::[a-fA-F0-9]{1,4}){1,6})\](?:\/(1[0-1][0-9]|12[0-8]|[0-9]?[0-9]))?$/;
    return ipv6Pattern.test(address);
}

function isHttps(port) {
    return globalThis.httpConfig.defaultHttpsPorts.includes(port);
}

function selectSniHost(address) {
    const isCustomAddr = settings.customCdnAddrs.includes(address);
    const sni = isCustomAddr ? settings.customCdnSni : randomUpperCase(globalThis.httpConfig.hostName);
    const host = isCustomAddr ? settings.customCdnHost : globalThis.httpConfig.hostName;
    return { host, sni, allowInsecure: isCustomAddr };
}

function generateRemark(index, port, address, protocol, isFragment, isChain) {
    const isCustomAddr = settings.customCdnAddrs.includes(address);
    const configType = isCustomAddr ? ' C' : isFragment ? ' F' : '';
    const chainSign = isChain ? '🔗 ' : '';
    const protoSign = protocol === 'vless' ? 'VLESS' : 'TROJAN';
    let addressType;
    
    settings.cleanIPs.includes(address)
        ? addressType = 'Clean IP'
        : addressType = isDomain(address) ? 'Domain' : isIPv4(address) ? 'IPv4' : isIPv6(address) ? 'IPv6' : '';
    
    return `💦 ${index} - ${chainSign}${protoSign}${configType} - ${addressType} : ${port}`;
}

async function getConfigAddresses(isFragment) {
    const { ipv4, ipv6 } = await resolveDNS(globalThis.httpConfig.hostName, !settings.enableIPv6);
    const addrs = [
        globalThis.httpConfig.hostName,
        'www.speedtest.net',
        ...ipv4,
        ...ipv6.map(ip => `[${ip}]`),
        ...settings.cleanIPs
    ];
    
    if (!isFragment) {
        addrs.push(...settings.customCdnAddrs);
    }
    return addrs;
}

function getProtocols() {
    const protocols = [];
    if (settings.VLConfigs) protocols.push('vless');
    if (settings.TRConfigs) protocols.push('trojan');
    return protocols;
}

// ==================== دوال توليد الكونفيجات المتقدمة ====================

function generateVlessXray() {
    const config = {
        log: { loglevel: settings.logLevel },
        inbounds: [{
            port: 10808,
            protocol: "socks",
            settings: { auth: "noauth", udp: true },
            sniffing: { enabled: true, destOverride: ["http", "tls"] }
        }],
        outbounds: [{
            protocol: "vless",
            settings: {
                vnext: [{
                    address: settings.targetServer,
                    port: settings.port,
                    users: [{ id: settings.uuid, encryption: "none", flow: "xtls-rprx-vision" }]
                }]
            },
            streamSettings: {
                network: "ws",
                wsSettings: { path: settings.path, headers: settings.host ? { Host: settings.host } : undefined },
                security: "tls",
                tlsSettings: {
                    serverName: settings.sni || settings.host || settings.targetServer,
                    fingerprint: settings.fingerprint,
                    alpn: settings.alpn ? settings.alpn.split(',') : ["http/1.1"]
                }
            }
        }]
    };
    return JSON.stringify(config, null, 2);
}

function generateVlessSingbox() {
    const config = {
        log: { level: "warn" },
        inbounds: [
            { type: "tun", tag: "tun-in", address: ["172.19.0.1/28"], auto_route: true, stack: "mixed" },
            { type: "mixed", tag: "mixed-in", listen: "127.0.0.1", listen_port: 2080 }
        ],
        outbounds: [{
            type: "vless",
            tag: "proxy",
            server: settings.targetServer,
            server_port: settings.port,
            uuid: settings.uuid,
            flow: "xtls-rprx-vision",
            tls: {
                enabled: true,
                server_name: settings.sni || settings.host || settings.targetServer,
                utls: { enabled: true, fingerprint: settings.fingerprint }
            },
            transport: {
                type: "ws",
                path: settings.path,
                headers: settings.host ? { Host: settings.host } : undefined
            }
        }],
        route: { final: "proxy" }
    };
    return JSON.stringify(config, null, 2);
}

function generateVlessClash() {
    const proxy = {
        name: "BPB-VLESS",
        type: "vless",
        server: settings.targetServer,
        port: settings.port,
        uuid: settings.uuid,
        flow: "xtls-rprx-vision",
        tls: true,
        "client-fingerprint": settings.fingerprint,
        network: "ws",
        "ws-opts": { path: settings.path, headers: settings.host ? { Host: settings.host } : undefined }
    };
    
    return `mixed-port: 7890
mode: rule
log-level: ${settings.logLevel}
proxies:
  ${JSON.stringify(proxy, null, 2).replace(/\n/g, '\n  ')}
proxy-groups:
  - name: "PROXY"
    type: select
    proxies: ["BPB-VLESS", "DIRECT"]
rules:
  - MATCH,PROXY
`;
}

function generateVlessLink() {
    const params = new URLSearchParams();
    params.append('encryption', 'none');
    params.append('flow', 'xtls-rprx-vision');
    params.append('security', 'tls');
    if (settings.sni || settings.host) params.append('sni', settings.sni || settings.host);
    params.append('fp', settings.fingerprint);
    params.append('type', 'ws');
    params.append('path', settings.path);
    if (settings.host) params.append('host', settings.host);
    return `vless://${settings.uuid}@${settings.targetServer}:${settings.port}?${params.toString()}#BPB-VLESS`;
}

function generateTrojanXray() {
    const config = {
        log: { loglevel: settings.logLevel },
        outbounds: [{
            protocol: "trojan",
            settings: { servers: [{ address: settings.targetServer, port: settings.port, password: settings.trojanPassword }] },
            streamSettings: {
                network: "ws",
                wsSettings: { path: settings.path, headers: settings.host ? { Host: settings.host } : undefined },
                security: settings.port === 443 ? "tls" : "none",
                ...(settings.port === 443 ? {
                    tlsSettings: {
                        serverName: settings.sni || settings.host || settings.targetServer,
                        fingerprint: settings.fingerprint
                    }
                } : {})
            }
        }]
    };
    return JSON.stringify(config, null, 2);
}

function generateTrojanSingbox() {
    const config = {
        log: { level: "warn" },
        outbounds: [{
            type: "trojan",
            tag: "proxy",
            server: settings.targetServer,
            server_port: settings.port,
            password: settings.trojanPassword,
            ...(settings.port === 443 ? {
                tls: { enabled: true, server_name: settings.sni || settings.host || settings.targetServer, utls: { enabled: true, fingerprint: settings.fingerprint } }
            } : {}),
            transport: { type: "ws", path: settings.path, headers: settings.host ? { Host: settings.host } : undefined }
        }],
        route: { final: "proxy" }
    };
    return JSON.stringify(config, null, 2);
}

function generateTrojanClash() {
    const proxy = {
        name: "BPB-TROJAN",
        type: "trojan",
        server: settings.targetServer,
        port: settings.port,
        password: settings.trojanPassword,
        ...(settings.port === 443 ? { tls: true, "client-fingerprint": settings.fingerprint } : {}),
        network: "ws",
        "ws-opts": { path: settings.path, headers: settings.host ? { Host: settings.host } : undefined }
    };
    
    return `mixed-port: 7890
mode: rule
proxies:
  ${JSON.stringify(proxy, null, 2).replace(/\n/g, '\n  ')}
proxy-groups:
  - name: "PROXY"
    type: select
    proxies: ["BPB-TROJAN", "DIRECT"]
rules:
  - MATCH,PROXY
`;
}

function generateTrojanLink() {
    const params = new URLSearchParams();
    if (settings.port === 443) {
        params.append('security', 'tls');
        if (settings.sni || settings.host) params.append('sni', settings.sni || settings.host);
        params.append('fp', settings.fingerprint);
    }
    params.append('type', 'ws');
    params.append('path', settings.path);
    if (settings.host) params.append('host', settings.host);
    const paramStr = params.toString();
    return `trojan://${settings.trojanPassword}@${settings.targetServer}:${settings.port}${paramStr ? '?' + paramStr : ''}#BPB-TROJAN`;
}

function generateVmessXray() {
    const config = {
        outbounds: [{
            protocol: "vmess",
            settings: {
                vnext: [{
                    address: settings.targetServer,
                    port: settings.port,
                    users: [{ id: settings.uuid, security: settings.vmessSecurity, alterId: settings.vmessAid }]
                }]
            },
            streamSettings: {
                network: "ws",
                wsSettings: { path: settings.path, headers: settings.host ? { Host: settings.host } : undefined },
                security: settings.port === 443 ? "tls" : "none",
                ...(settings.port === 443 ? {
                    tlsSettings: { serverName: settings.sni || settings.host || settings.targetServer, fingerprint: settings.fingerprint }
                } : {})
            }
        }]
    };
    return JSON.stringify(config, null, 2);
}

function generateVmessSingbox() {
    const config = {
        outbounds: [{
            type: "vmess",
            tag: "proxy",
            server: settings.targetServer,
            server_port: settings.port,
            uuid: settings.uuid,
            security: settings.vmessSecurity,
            alter_id: settings.vmessAid,
            ...(settings.port === 443 ? {
                tls: { enabled: true, server_name: settings.sni || settings.host || settings.targetServer, utls: { enabled: true, fingerprint: settings.fingerprint } }
            } : {}),
            transport: { type: "ws", path: settings.path, headers: settings.host ? { Host: settings.host } : undefined }
        }],
        route: { final: "proxy" }
    };
    return JSON.stringify(config, null, 2);
}

function generateVmessClash() {
    const proxy = {
        name: "BPB-VMESS",
        type: "vmess",
        server: settings.targetServer,
        port: settings.port,
        uuid: settings.uuid,
        alterId: settings.vmessAid,
        cipher: settings.vmessSecurity,
        tls: settings.port === 443,
        "client-fingerprint": settings.fingerprint,
        network: "ws",
        "ws-opts": { path: settings.path, headers: settings.host ? { Host: settings.host } : undefined }
    };
    
    if (settings.port === 443 && (settings.sni || settings.host)) {
        proxy.servername = settings.sni || settings.host;
    }
    
    return `mixed-port: 7890
mode: rule
proxies:
  ${JSON.stringify(proxy, null, 2).replace(/\n/g, '\n  ')}
proxy-groups:
  - name: "PROXY"
    type: select
    proxies: ["BPB-VMESS", "DIRECT"]
rules:
  - MATCH,PROXY
`;
}

function generateVmessLink() {
    const vmessJson = {
        v: "2",
        ps: "BPB-VMESS",
        add: settings.targetServer,
        port: settings.port,
        id: settings.uuid,
        aid: settings.vmessAid,
        net: "ws",
        type: "none",
        host: settings.host || "",
        path: settings.path,
        ...(settings.port === 443 ? { tls: "tls", sni: settings.sni || settings.host || settings.targetServer, fp: settings.fingerprint } : {})
    };
    return `vmess://${Buffer.from(JSON.stringify(vmessJson)).toString('base64')}`;
}

function generateShadowsocksXray() {
    const config = {
        outbounds: [{
            protocol: "shadowsocks",
            settings: {
                servers: [{ address: settings.targetServer, port: settings.port, method: settings.shadowsocksMethod, password: settings.shadowsocksPassword }]
            }
        }]
    };
    return JSON.stringify(config, null, 2);
}

function generateShadowsocksSingbox() {
    const config = {
        outbounds: [{
            type: "shadowsocks",
            tag: "proxy",
            server: settings.targetServer,
            server_port: settings.port,
            method: settings.shadowsocksMethod,
            password: settings.shadowsocksPassword
        }],
        route: { final: "proxy" }
    };
    return JSON.stringify(config, null, 2);
}

function generateShadowsocksLink() {
    const auth = Buffer.from(`${settings.shadowsocksMethod}:${settings.shadowsocksPassword}`).toString('base64');
    return `ss://${auth}@${settings.targetServer}:${settings.port}#BPB-SS`;
}

function generateWarpStandard() {
    return `[Interface]
PrivateKey = ${settings.warpPrivateKey}
Address = 172.16.0.2/32, ${settings.warpIPv6}
DNS = 1.1.1.1, 1.0.0.1
MTU = 1280

[Peer]
PublicKey = ${settings.warpPublicKey}
Endpoint = ${settings.warpEndpoints[0]}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
Reserved = ${settings.warpReserved}`;
}

function generateWarpPro() {
    return `[Interface]
PrivateKey = ${settings.warpPrivateKey}
Address = 172.16.0.2/32, ${settings.warpIPv6}
DNS = 1.1.1.1, 1.0.0.1
MTU = 1280
Jc = ${settings.amneziaNoiseCount}
Jmin = ${settings.amneziaNoiseSizeMin}
Jmax = ${settings.amneziaNoiseSizeMax}

[Peer]
PublicKey = ${settings.warpPublicKey}
Endpoint = ${settings.warpEndpoints[0]}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
Reserved = ${settings.warpReserved}`;
}

function generateAllConfigsZip() {
    const zip = new JSZip();
    
    zip.file("vless_xray.json", generateVlessXray());
    zip.file("vless_singbox.json", generateVlessSingbox());
    zip.file("vless_clash.yaml", generateVlessClash());
    zip.file("vless_link.txt", generateVlessLink());
    zip.file("trojan_xray.json", generateTrojanXray());
    zip.file("trojan_singbox.json", generateTrojanSingbox());
    zip.file("trojan_clash.yaml", generateTrojanClash());
    zip.file("trojan_link.txt", generateTrojanLink());
    zip.file("vmess_xray.json", generateVmessXray());
    zip.file("vmess_singbox.json", generateVmessSingbox());
    zip.file("vmess_clash.yaml", generateVmessClash());
    zip.file("vmess_link.txt", generateVmessLink());
    zip.file("shadowsocks_xray.json", generateShadowsocksXray());
    zip.file("shadowsocks_singbox.json", generateShadowsocksSingbox());
    zip.file("shadowsocks_link.txt", generateShadowsocksLink());
    zip.file("warp_standard.conf", generateWarpStandard());
    zip.file("warp_pro.conf", generateWarpPro());
    
    return zip;
}

function generateSubscriptionBase64() {
    const links = [
        generateVlessLink(),
        generateTrojanLink(),
        generateVmessLink(),
        generateShadowsocksLink()
    ];
    return Buffer.from(links.join('\n')).toString('base64');
}

// ==================== توليد جميع الكونفيجات دفعة واحدة ====================
async function generateAllConfigs() {
    const zip = generateAllConfigsZip();
    const buffer = await zip.generateAsync({ type: "uint8array" });
    return buffer;
}

// ==================== قاعدة بيانات المستخدمين ====================
let authorizedUsers = new Set();

// ==================== واجهة البوت (الأزرار والقوائم) ====================

const mainMenu = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('📦 VLESS كونفيج', 'menu_vless')],
        [Markup.button.callback('🔐 TROJAN كونفيج', 'menu_trojan')],
        [Markup.button.callback('🚀 VMESS كونفيج', 'menu_vmess')],
        [Markup.button.callback('🔒 SHADOWSOCKS كونفيج', 'menu_ss')],
        [Markup.button.callback('🪄 WARP كونفيج', 'menu_warp')],
        [Markup.button.callback('📦 جميع الكونفيجات', 'menu_all_configs')],
        [Markup.button.callback('⚙️ إعدادات الخادم', 'menu_settings')],
        [Markup.button.callback('🔧 إعدادات متقدمة', 'menu_advanced')],
        [Markup.button.callback('🔗 روابط الاشتراك', 'menu_subscription')],
        [Markup.button.callback('👥 إدارة المستخدمين', 'menu_users')],
        [Markup.button.callback('ℹ️ حالة البوت', 'menu_status')]
    ]);
};

const vlessMenu = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🎯 Xray Config', 'gen_vless_xray')],
        [Markup.button.callback('📦 Sing-box Config', 'gen_vless_singbox')],
        [Markup.button.callback('⚡ Clash Config', 'gen_vless_clash')],
        [Markup.button.callback('🔗 VLESS Link', 'gen_vless_link')],
        [Markup.button.callback('◀️ العودة', 'back_to_main')]
    ]);
};

const trojanMenu = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🎯 Xray Config', 'gen_trojan_xray')],
        [Markup.button.callback('📦 Sing-box Config', 'gen_trojan_singbox')],
        [Markup.button.callback('⚡ Clash Config', 'gen_trojan_clash')],
        [Markup.button.callback('🔗 Trojan Link', 'gen_trojan_link')],
        [Markup.button.callback('◀️ العودة', 'back_to_main')]
    ]);
};

const vmessMenu = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🎯 Xray Config', 'gen_vmess_xray')],
        [Markup.button.callback('📦 Sing-box Config', 'gen_vmess_singbox')],
        [Markup.button.callback('⚡ Clash Config', 'gen_vmess_clash')],
        [Markup.button.callback('🔗 VMESS Link', 'gen_vmess_link')],
        [Markup.button.callback('◀️ العودة', 'back_to_main')]
    ]);
};

const ssMenu = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🎯 Xray Config', 'gen_ss_xray')],
        [Markup.button.callback('📦 Sing-box Config', 'gen_ss_singbox')],
        [Markup.button.callback('🔗 SS Link', 'gen_ss_link')],
        [Markup.button.callback('◀️ العودة', 'back_to_main')]
    ]);
};

const warpMenu = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('Standard WARP', 'gen_warp_standard')],
        [Markup.button.callback('WARP Pro (Amnezia)', 'gen_warp_pro')],
        [Markup.button.callback('◀️ العودة', 'back_to_main')]
    ]);
};

const settingsMenu = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback(`🌐 Target Server: ${settings.targetServer}`, 'edit_target_server')],
        [Markup.button.callback(`🔌 Port: ${settings.port}`, 'edit_port')],
        [Markup.button.callback(`📁 Path: ${settings.path || '/'}`, 'edit_path')],
        [Markup.button.callback(`🏠 Host: ${settings.host || 'auto'}`, 'edit_host')],
        [Markup.button.callback(`🎯 SNI: ${settings.sni || 'auto'}`, 'edit_sni')],
        [Markup.button.callback(`🔗 ALPN: ${settings.alpn || 'http/1.1'}`, 'edit_alpn')],
        [Markup.button.callback(`🖥️ Fingerprint: ${settings.fingerprint}`, 'edit_fingerprint')],
        [Markup.button.callback(`🔑 UUID: ${settings.uuid.substring(0, 12)}...`, 'edit_uuid')],
        [Markup.button.callback(`🔐 Trojan Pass: ${settings.trojanPassword.substring(0, 8)}...`, 'edit_trojan_pass')],
        [Markup.button.callback(`🔒 Shadowsocks Pass`, 'edit_ss_pass')],
        [Markup.button.callback('◀️ العودة', 'back_to_main')]
    ]);
};

const advancedMenu = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback(`📡 Local DNS: ${settings.localDNS}`, 'edit_local_dns')],
        [Markup.button.callback(`🌍 Remote DNS: ${settings.remoteDNS.substring(0, 20)}...`, 'edit_remote_dns')],
        [Markup.button.callback(`🚀 Warp DNS: ${settings.warpRemoteDNS.substring(0, 20)}...`, 'edit_warp_dns')],
        [Markup.button.callback(`📶 IPv6: ${settings.enableIPv6 ? '✅ مفعل' : '❌ معطل'}`, 'toggle_ipv6')],
        [Markup.button.callback(`✂️ Fragment: ${settings.fragmentMode}`, 'edit_fragment')],
        [Markup.button.callback(`🪄 Warp: ${settings.enableWarp ? '✅ مفعل' : '❌ معطل'}`, 'toggle_warp')],
        [Markup.button.callback(`🔒 ECH: ${settings.enableECH ? '✅ مفعل' : '❌ معطل'}`, 'toggle_ech')],
        [Markup.button.callback(`🚫 Block UDP 443: ${settings.blockUDP443 ? '✅ مفعل' : '❌ معطل'}`, 'toggle_block_udp')],
        [Markup.button.callback('◀️ العودة', 'back_to_main')]
    ]);
};

const subscriptionMenu = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('📦 VLESS Link', 'sub_vless')],
        [Markup.button.callback('🔐 TROJAN Link', 'sub_trojan')],
        [Markup.button.callback('🚀 VMESS Link', 'sub_vmess')],
        [Markup.button.callback('🔒 Shadowsocks Link', 'sub_ss')],
        [Markup.button.callback('📋 Subscription (Base64)', 'sub_base64')],
        [Markup.button.callback('◀️ العودة', 'back_to_main')]
    ]);
};

const usersMenu = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('➕ إضافة مستخدم', 'add_user')],
        [Markup.button.callback('➖ حذف مستخدم', 'remove_user')],
        [Markup.button.callback(`👥 المستخدمون: ${authorizedUsers.size}`, 'list_users')],
        [Markup.button.callback('◀️ العودة', 'back_to_main')]
    ]);
};

// ==================== تهيئة البوت ====================
const bot = new Telegraf(BOT_TOKEN);
bot.telegram.setWebhook = async (url) => {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${url}`);
    return response.json();
};

bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    if (ctx) ctx.reply('⚠️ حدث خطأ، حاول مرة أخرى');
});

// ==================== أمر /start ====================
bot.start(async (ctx) => {
    const welcomeMessage = `
🌐 *مرحباً بك في BPB PANEL BOT - الإصدار المتكامل*

🤖 بوت متكامل للتحكم الكامل في BPB Panel

📌 *الخصائص:*
• VLESS / TROJAN / VMESS / SHADOWSOCKS / WARP
• Xray / Sing-box / Clash Configs (حقيقية)
• روابط اشتراك (URI + Base64)
• تحكم كامل بجميع الإعدادات
• إدارة المستخدمين (للمالك فقط)
• تصدير جميع الكونفيجات مرة واحدة

📦 *الإعدادات الحالية:*
• Server: \`${settings.targetServer}:${settings.port}\`
• Path: \`${settings.path || '/'}\`
• UUID: \`${settings.uuid.substring(0, 12)}...\`
• Trojan Pass: \`${settings.trojanPassword.substring(0, 8)}...\`

👑 *المالك:* \`${OWNER_ID}\`

📱 استخدم الأزرار أدناه للتحكم
    `;
    
    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown', ...mainMenu() });
});

// ==================== معالج القوائم ====================

const menuHandlers = {
    'back_to_main': async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('📱 *القائمة الرئيسية*', { parse_mode: 'Markdown', ...mainMenu() });
    },
    'menu_vless': async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('📦 *VLESS كونفيج*\nاختر نوع الكونفيج المطلوب:', { parse_mode: 'Markdown', ...vlessMenu() });
    },
    'menu_trojan': async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('🔐 *TROJAN كونفيج*\nاختر نوع الكونفيج المطلوب:', { parse_mode: 'Markdown', ...trojanMenu() });
    },
    'menu_vmess': async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('🚀 *VMESS كونفيج*\nاختر نوع الكونفيج المطلوب:', { parse_mode: 'Markdown', ...vmessMenu() });
    },
    'menu_ss': async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('🔒 *SHADOWSOCKS كونفيج*\nاختر نوع الكونفيج المطلوب:', { parse_mode: 'Markdown', ...ssMenu() });
    },
    'menu_warp': async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('🪄 *WARP كونفيج*\nاختر نوع WARP:', { parse_mode: 'Markdown', ...warpMenu() });
    },
    'menu_all_configs': async (ctx) => {
        await ctx.answerCbQuery('📦 جاري تجهيز جميع الكونفيجات...');
        try {
            const buffer = await generateAllConfigs();
            await ctx.telegram.sendDocument(ctx.chat.id, { source: buffer, filename: `bpb_all_configs_${Date.now()}.zip` });
            await ctx.telegram.sendMessage(ctx.chat.id, '✅ تم إرسال جميع الكونفيجات كملف مضغوط');
        } catch (error) {
            await ctx.telegram.sendMessage(ctx.chat.id, `❌ خطأ: ${error.message}`);
        }
    },
    'menu_settings': async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('⚙️ *إعدادات الخادم*\nاختر الإعداد المراد تغييره:', { parse_mode: 'Markdown', ...settingsMenu() });
    },
    'menu_advanced': async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('🔧 *الإعدادات المتقدمة*', { parse_mode: 'Markdown', ...advancedMenu() });
    },
    'menu_subscription': async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('🔗 *روابط الاشتراك*\nاختر الرابط المطلوب:', { parse_mode: 'Markdown', ...subscriptionMenu() });
    },
    'menu_users': async (ctx) => {
        if (ctx.from.id !== OWNER_ID) {
            await ctx.answerCbQuery('⛔ هذا القسم للمالك فقط!', true);
            return;
        }
        await ctx.answerCbQuery();
        await ctx.editMessageText('👥 *إدارة المستخدمين*', { parse_mode: 'Markdown', ...usersMenu() });
    },
    'menu_status': async (ctx) => {
        const statusMessage = `
ℹ️ *حالة البوت*

🤖 *البوت:* ${ctx.botInfo.first_name}
👑 *المالك:* \`${OWNER_ID}\`
👥 *المستخدمون:* ${authorizedUsers.size}

📦 *الإعدادات الحالية:*
• Server: \`${settings.targetServer}:${settings.port}\`
• Path: \`${settings.path || '/'}\`
• Host: \`${settings.host || 'auto'}\`
• SNI: \`${settings.sni || 'auto'}\`
• Fingerprint: \`${settings.fingerprint}\`
• ALPN: \`${settings.alpn || 'http/1.1'}\`
• IPv6: ${settings.enableIPv6 ? '✅' : '❌'}
• Fragment: \`${settings.fragmentMode}\`
• Warp: ${settings.enableWarp ? '✅' : '❌'}
• VLESS Configs: ${settings.VLConfigs ? '✅' : '❌'}
• TROJAN Configs: ${settings.TRConfigs ? '✅' : '❌'}

📅 *آخر تحديث:* ${new Date().toLocaleString()}
        `;
        await ctx.answerCbQuery();
        await ctx.editMessageText(statusMessage, { parse_mode: 'Markdown', ...mainMenu() });
    }
};

for (const [action, handler] of Object.entries(menuHandlers)) {
    bot.action(action, handler);
}

// ==================== معالج توليد الكونفيجات (النسخة المصححة) ====================

const generateHandlers = {
    'gen_vless_xray': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء كونفيج VLESS Xray...');
        const config = generateVlessXray();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `vless_xray_${Date.now()}.json` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_vless_singbox': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء كونفيج VLESS Sing-box...');
        const config = generateVlessSingbox();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `vless_singbox_${Date.now()}.json` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_vless_clash': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء كونفيج VLESS Clash...');
        const config = generateVlessClash();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `vless_clash_${Date.now()}.yaml` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_vless_link': async (ctx) => {
        const link = generateVlessLink();
        await ctx.answerCbQuery();
        await ctx.telegram.sendMessage(ctx.chat.id, `📦 *رابط VLESS*\n\n\`${link}\``, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ الرابط', link)]]) });
    },
    'gen_trojan_xray': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء كونفيج TROJAN Xray...');
        const config = generateTrojanXray();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `trojan_xray_${Date.now()}.json` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_trojan_singbox': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء كونفيج TROJAN Sing-box...');
        const config = generateTrojanSingbox();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `trojan_singbox_${Date.now()}.json` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_trojan_clash': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء كونفيج TROJAN Clash...');
        const config = generateTrojanClash();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `trojan_clash_${Date.now()}.yaml` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_trojan_link': async (ctx) => {
        const link = generateTrojanLink();
        await ctx.answerCbQuery();
        await ctx.telegram.sendMessage(ctx.chat.id, `🔐 *رابط TROJAN*\n\n\`${link}\``, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ الرابط', link)]]) });
    },
    'gen_vmess_xray': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء كونفيج VMESS Xray...');
        const config = generateVmessXray();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `vmess_xray_${Date.now()}.json` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_vmess_singbox': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء كونفيج VMESS Sing-box...');
        const config = generateVmessSingbox();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `vmess_singbox_${Date.now()}.json` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_vmess_clash': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء كونفيج VMESS Clash...');
        const config = generateVmessClash();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `vmess_clash_${Date.now()}.yaml` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_vmess_link': async (ctx) => {
        const link = generateVmessLink();
        await ctx.answerCbQuery();
        await ctx.telegram.sendMessage(ctx.chat.id, `🚀 *رابط VMESS*\n\n\`${link}\``, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ الرابط', link)]]) });
    },
    'gen_ss_xray': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء كونفيج Shadowsocks Xray...');
        const config = generateShadowsocksXray();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `shadowsocks_xray_${Date.now()}.json` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_ss_singbox': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء كونفيج Shadowsocks Sing-box...');
        const config = generateShadowsocksSingbox();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `shadowsocks_singbox_${Date.now()}.json` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_ss_link': async (ctx) => {
        const link = generateShadowsocksLink();
        await ctx.answerCbQuery();
        await ctx.telegram.sendMessage(ctx.chat.id, `🔒 *رابط Shadowsocks*\n\n\`${link}\``, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ الرابط', link)]]) });
    },
    'gen_warp_standard': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء WARP Standard Config...');
        const config = generateWarpStandard();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `warp_standard_${Date.now()}.conf` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'gen_warp_pro': async (ctx) => {
        await ctx.answerCbQuery('🔨 جاري إنشاء WARP Pro Config...');
        const config = generateWarpPro();
        await ctx.telegram.sendDocument(ctx.chat.id, { source: Buffer.from(config), filename: `warp_pro_${Date.now()}.conf` });
        await ctx.telegram.sendMessage(ctx.chat.id, '📋 *تم إنشاء الكونفيج*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ النص', config)]]) });
    },
    'sub_vless': async (ctx) => {
        const link = generateVlessLink();
        await ctx.answerCbQuery();
        await ctx.telegram.sendMessage(ctx.chat.id, `📦 *رابط VLESS*\n\n\`${link}\``, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ الرابط', link)]]) });
    },
    'sub_trojan': async (ctx) => {
        const link = generateTrojanLink();
        await ctx.answerCbQuery();
        await ctx.telegram.sendMessage(ctx.chat.id, `🔐 *رابط TROJAN*\n\n\`${link}\``, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ الرابط', link)]]) });
    },
    'sub_vmess': async (ctx) => {
        const link = generateVmessLink();
        await ctx.answerCbQuery();
        await ctx.telegram.sendMessage(ctx.chat.id, `🚀 *رابط VMESS*\n\n\`${link}\``, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ الرابط', link)]]) });
    },
    'sub_ss': async (ctx) => {
        const link = generateShadowsocksLink();
        await ctx.answerCbQuery();
        await ctx.telegram.sendMessage(ctx.chat.id, `🔒 *رابط Shadowsocks*\n\n\`${link}\``, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ الرابط', link)]]) });
    },
    'sub_base64': async (ctx) => {
        const subscription = generateSubscriptionBase64();
        await ctx.answerCbQuery();
        await ctx.telegram.sendMessage(ctx.chat.id, `📋 *الاشتراك (Base64)*\n\n\`${subscription}\``, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.copyText('📋 نسخ الاشتراك', subscription)]]) });
    }
};

for (const [action, handler] of Object.entries(generateHandlers)) {
    bot.action(action, handler);
}

// ==================== معالج تغيير الإعدادات ====================

const editHandlers = {
    'edit_target_server': { prompt: '🌐 أرسل Target Server الجديد:', setter: (v) => settings.targetServer = v },
    'edit_port': { prompt: '🔌 أرسل المنفذ الجديد:', setter: (v) => { const p = parseInt(v); if (!isNaN(p) && p > 0 && p < 65535) settings.port = p; else throw new Error('منفذ غير صالح'); } },
    'edit_path': { prompt: '📁 أرسل المسار الجديد:', setter: (v) => settings.path = v },
    'edit_host': { prompt: '🏠 أرسل Host الجديد:', setter: (v) => settings.host = v },
    'edit_sni': { prompt: '🎯 أرسل SNI الجديد:', setter: (v) => settings.sni = v },
    'edit_alpn': { prompt: '🔗 أرسل ALPN الجديد:', setter: (v) => settings.alpn = v },
    'edit_fingerprint': { prompt: '🖥️ أرسل Fingerprint الجديد:', setter: (v) => { if (['chrome','firefox','safari','ios','android','edge','random','randomized'].includes(v)) settings.fingerprint = v; else throw new Error('Fingerprint غير صالح'); } },
    'edit_uuid': { prompt: '🔑 أرسل UUID الجديد:', setter: (v) => { if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) settings.uuid = v; else throw new Error('UUID غير صالح'); } },
    'edit_trojan_pass': { prompt: '🔐 أرسل كلمة مرور Trojan الجديدة:', setter: (v) => settings.trojanPassword = v },
    'edit_ss_pass': { prompt: '🔒 أرسل كلمة مرور Shadowsocks الجديدة:', setter: (v) => settings.shadowsocksPassword = v },
    'edit_local_dns': { prompt: '📡 أرسل Local DNS الجديد:', setter: (v) => settings.localDNS = v },
    'edit_remote_dns': { prompt: '🌍 أرسل Remote DNS الجديد:', setter: (v) => settings.remoteDNS = v },
    'edit_warp_dns': { prompt: '🚀 أرسل Warp DNS الجديد:', setter: (v) => settings.warpRemoteDNS = v },
    'edit_fragment': { prompt: '✂️ أرسل وضع Fragment الجديد:', setter: (v) => { if (['off','low','medium','high','custom'].includes(v)) settings.fragmentMode = v; else throw new Error('وضع Fragment غير صالح'); } },
    'add_user': { prompt: '➕ أرسل ID المستخدم للإضافة:', setter: (v) => { const id = parseInt(v); if (!isNaN(id) && id !== OWNER_ID) authorizedUsers.add(id); else throw new Error('ID غير صالح'); }, successMsg: (v) => `✅ تم إضافة المستخدم \`${v}\`` },
    'remove_user': { prompt: '➖ أرسل ID المستخدم للحذف:', setter: (v) => { const id = parseInt(v); if (!isNaN(id) && authorizedUsers.has(id)) authorizedUsers.delete(id); else throw new Error('المستخدم غير موجود'); }, successMsg: (v) => `✅ تم حذف المستخدم \`${v}\`` }
};

const toggleHandlers = {
    'toggle_ipv6': async () => { settings.enableIPv6 = !settings.enableIPv6; return `IPv6: ${settings.enableIPv6 ? '✅ مفعل' : '❌ معطل'}`; },
    'toggle_warp': async () => { settings.enableWarp = !settings.enableWarp; return `Warp: ${settings.enableWarp ? '✅ مفعل' : '❌ معطل'}`; },
    'toggle_ech': async () => { settings.enableECH = !settings.enableECH; return `ECH: ${settings.enableECH ? '✅ مفعل' : '❌ معطل'}`; },
    'toggle_block_udp': async () => { settings.blockUDP443 = !settings.blockUDP443; return `Block UDP 443: ${settings.blockUDP443 ? '✅ مفعل' : '❌ معطل'}`; }
};

for (const [action, handler] of Object.entries(toggleHandlers)) {
    bot.action(action, async (ctx) => {
        const result = await handler(ctx);
        await ctx.answerCbQuery(result);
        await ctx.editMessageText('🔧 *الإعدادات المتقدمة* (تم التحديث)', { parse_mode: 'Markdown', ...advancedMenu() });
    });
}

bot.action('list_users', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        await ctx.answerCbQuery('⛔ هذا الأمر للمالك فقط!', true);
        return;
    }
    
    let usersList = '👥 *قائمة المستخدمين*\n\n';
    usersList += `👑 المالك: \`${OWNER_ID}\`\n\n`;
    usersList += `📋 المستخدمون (${authorizedUsers.size}):\n`;
    
    for (const id of authorizedUsers) {
        usersList += `• \`${id}\`\n`;
    }
    
    if (authorizedUsers.size === 0) usersList += 'لا يوجد مستخدمون';
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(usersList, { parse_mode: 'Markdown', ...usersMenu() });
});

for (const [action, handler] of Object.entries(editHandlers)) {
    bot.action(action, async (ctx) => {
        if (action === 'add_user' || action === 'remove_user') {
            if (ctx.from.id !== OWNER_ID) {
                await ctx.answerCbQuery('⛔ هذا الأمر للمالك فقط!', true);
                return;
            }
        }
        
        await ctx.answerCbQuery();
        userSessions.set(ctx.from.id.toString(), { waitingFor: action });
        await ctx.editMessageText(`${handler.prompt}\n\n(أرسل /cancel للإلغاء)`, { parse_mode: 'Markdown' });
    });
}

// ==================== معالج النصوص ====================
bot.on('text', async (ctx) => {
    const session = userSessions.get(ctx.from.id.toString());
    if (!session?.waitingFor) return;
    
    const action = session.waitingFor;
    const value = ctx.message.text.trim();
    
    if (value === '/cancel') {
        userSessions.delete(ctx.from.id.toString());
        await ctx.reply('❌ تم الإلغاء', { ...mainMenu() });
        return;
    }
    
    const handler = editHandlers[action];
    if (!handler) {
        userSessions.delete(ctx.from.id.toString());
        return;
    }
    
    try {
        handler.setter(value);
        userSessions.delete(ctx.from.id.toString());
        
        const message = handler.successMsg ? handler.successMsg(value) : `✅ تم التحديث بنجاح!`;
        await ctx.reply(message, { parse_mode: 'Markdown' });
        
        if (action.startsWith('edit_') && !action.includes('user')) {
            await ctx.reply('⚙️ *إعدادات الخادم*', { parse_mode: 'Markdown', ...settingsMenu() });
        } else if (action === 'add_user' || action === 'remove_user') {
            await ctx.reply('👥 *إدارة المستخدمين*', { parse_mode: 'Markdown', ...usersMenu() });
        } else {
            await ctx.reply('📱 *القائمة الرئيسية*', { parse_mode: 'Markdown', ...mainMenu() });
        }
    } catch (error) {
        await ctx.reply(`❌ ${error.message}\n${handler.prompt}`);
    }
});

// ==================== تصدير البوت لـ Cloudflare Workers ====================
export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            
            // معالج Webhook من تيليجرام
            if (url.pathname === '/webhook' && request.method === 'POST') {
                const update = await request.json();
                ctx.waitUntil(bot.handleUpdate(update));
                return new Response('OK', { status: 200 });
            }
            
            // معالج الإعدادات لـ Cloudflare Workers (تشغيل مرة واحدة)
            if (url.pathname === '/setup') {
                const webhookUrl = `${url.origin}/webhook`;
                const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${webhookUrl}`);
                const result = await response.json();
                return new Response(JSON.stringify(result, null, 2), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // الصفحة الرئيسية
            return new Response(`
                <html>
                <head><title>BPB Panel Bot</title></head>
                <body>
                    <h1>🤖 BPB Panel Bot</h1>
                    <p>Version: 4.1.3</p>
                    <p>Status: Running ✅</p>
                    <p>Owner ID: ${OWNER_ID}</p>
                    <p>Settings Count: ${Object.keys(settings).length}</p>
                    <p>Authorized Users: ${authorizedUsers.size}</p>
                    <hr>
                    <p><b>IMPORTANT:</b> Visit <a href="${url.origin}/setup">${url.origin}/setup</a> to configure webhook (run once)</p>
                    <p>Webhook endpoint: ${url.origin}/webhook</p>
                </body>
                </html>
            `, { 
                status: 200,
                headers: { 'Content-Type': 'text/html' }
            });
        } catch (error) {
            console.error('Worker error:', error);
            return new Response(`Error: ${error.message}`, { status: 500 });
        }
    }
};
