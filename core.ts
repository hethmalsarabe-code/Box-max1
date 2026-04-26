// ============================================
// BPB PANEL - INIT, HANDLERS, COMMON, UTILS
// Merged: init.ts + handlers.ts + common.ts + utils.ts
// Version: 4.1.3
// ============================================

// ===== PART 1: INIT FILE =====

import { getDataset } from "kv";
import { isValidUUID } from "@common";

globalThis.dict = {
    _VL_: atob('dmxlc3M='),
    _VL_CAP_: atob('VkxFU1M='),
    _VM_: atob('dm1lc3M='),
    _TR_: atob('dHJvamFu'),
    _TR_CAP_: atob('VHJvamFu'),
    _SS_: atob('c2hhZG93c29ja3M='),
    _V2_: atob('djJyYXk='),
    _project_: atob('QlBC'),
    _website_: atob('aHR0cHM6Ly9iaWEtcGFpbi1iYWNoZS5naXRodWIuaW8vQlBCLVdvcmtlci1QYW5lbC8='),
    _public_proxy_ip_: atob('YnBiLnlvdXNlZi5pc2VnYXJvLmNvbQ==')
};

globalThis.settings = {
    localDNS: "8.8.8.8",
    antiSanctionDNS: "178.22.122.100",
    fakeDNS: false,
    enableIPv6: true,
    allowLANConnection: false,
    logLevel: "warning",
    remoteDNS: "https://8.8.8.8/dns-query",
    remoteDnsHost: {
        host: "8.8.8.8",
        isDomain: false,
        ipv4: [],
        ipv6: []
    },
    proxyIPMode: "proxyip",
    proxyIPs: [],
    prefixes: [],
    outProxy: "",
    outProxyParams: {},
    cleanIPs: [],
    customCdnAddrs: [],
    customCdnHost: "",
    customCdnSni: "",
    bestVLTRInterval: 30,
    VLConfigs: true,
    TRConfigs: true,
    ports: [443],
    fingerprint: "chrome",
    enableTFO: false,
    fragmentMode: "custom",
    fragmentLengthMin: 100,
    fragmentLengthMax: 200,
    fragmentIntervalMin: 1,
    fragmentIntervalMax: 1,
    fragmentMaxSplitMin: undefined,
    fragmentMaxSplitMax: undefined,
    fragmentPackets: "tlshello",
    enableECH: false,
    echServerName: "",
    bypassIran: false,
    bypassChina: false,
    bypassRussia: false,
    bypassOpenAi: false,
    bypassGoogleAi: false,
    bypassMicrosoft: false,
    bypassOracle: false,
    bypassDocker: false,
    bypassAdobe: false,
    bypassEpicGames: false,
    bypassIntel: false,
    bypassAmd: false,
    bypassNvidia: false,
    bypassAsus: false,
    bypassHp: false,
    bypassLenovo: false,
    blockAds: false,
    blockPorn: false,
    blockUDP443: false,
    blockMalware: false,
    blockPhishing: false,
    blockCryptominers: false,
    customBypassRules: [],
    customBlockRules: [],
    customBypassSanctionRules: [],
    warpRemoteDNS: "1.1.1.1",
    warpEndpoints: ["engage.cloudflareclient.com:2408"],
    bestWarpInterval: 30,
    xrayUdpNoises: [
        {
            type: "rand",
            packet: "50-100",
            delay: "1-1",
            applyTo: "ip",
            count: 5
        }
    ],
    knockerNoiseMode: "quic",
    noiseCountMin: 10,
    noiseCountMax: 15,
    noiseSizeMin: 5,
    noiseSizeMax: 10,
    noiseDelayMin: 1,
    noiseDelayMax: 1,
    amneziaNoiseCount: 5,
    amneziaNoiseSizeMin: 50,
    amneziaNoiseSizeMax: 100,
    panelVersion: __VERSION__
};

export async function setSettings(request: Request, env: Env) {
    const dataset = await getDataset(request, env);
    globalThis.settings = dataset.settings;
}

export function init(request: Request, env: Env) {
    const { pathname } = new URL(request.url);
    const { UUID, TR_PASS, FALLBACK, DOH_URL } = env;

    globalThis.globalConfig = {
        userID: UUID,
        TrPass: TR_PASS,
        pathName: decodeURIComponent(pathname),
        fallbackDomain: FALLBACK || 'speed.cloudflare.com',
        dohURL: DOH_URL || 'https://cloudflare-dns.com/dns-query'
    };
}

export function initWs(env: any) {
    const { _public_proxy_ip_ } = globalThis.dict;

    globalThis.wsConfig = {
        envProxyIPs: env.PROXY_IP,
        envPrefixes: env.PREFIX,
        defaultProxyIPs: [_public_proxy_ip_],
        defaultPrefixes: [
            '[2a02:898:146:64::]',
            '[2602:fc59:b0:64::]',
            '[2602:fc59:11:64::]'
        ]
    };
}

export function initHttp(request: Request, env: any) {
    const { _VL_CAP_, _TR_CAP_, _website_ } = globalThis.dict;
    const { UUID, TR_PASS, SUB_PATH, kv } = env;
    const { pathname, origin, searchParams, hostname } = new URL(request.url);

    if (!['/secrets', '/favicon.ico'].includes(decodeURIComponent(pathname))) {
        if (!UUID || !TR_PASS) throw new Error(`Please set ${_VL_CAP_} UUID and ${_TR_CAP_} password first. Visit <a href="${origin}/secrets" target="_blank">here</a> to generate them.`, { cause: "init" });
        if (!isValidUUID(UUID)) throw new Error(`Invalid UUID: ${UUID}`, { cause: "init" });
        if (typeof kv !== 'object') throw new Error(`KV Dataset is not properly set! Please refer to <a href="${_website_}" target="_blank">tutorials</a>.`, { cause: "init" });
    }

    globalThis.httpConfig = {
        panelVersion: __VERSION__,
        defaultHttpPorts: [80, 8080, 2052, 2082, 2086, 2095, 8880],
        defaultHttpsPorts: [443, 8443, 2053, 2083, 2087, 2096],
        hostName: hostname,
        client: decodeURIComponent(searchParams.get('app') ?? ''),
        urlOrigin: origin,
        subPath: SUB_PATH || UUID,
    };
}

// ===== PART 2: HANDLERS FILE =====

import { Authenticate, generateJWTToken, resetPassword } from "auth";
import { getDataset, updateDataset } from "kv";
import { setSettings } from "@init";
import { getClNormalConfig, getClWarpConfig } from "@clash/configs";
import { getSbCustomConfig, getSbWarpConfig } from "@sing-box/configs";
import { getXrCustomConfigs, getXrWarpConfigs } from "@xray/configs";
import { fetchWarpAccounts } from "@warp";
import { VlOverWSHandler } from "@vless";
import { TrOverWSHandler } from "@trojan";
import JSZip from "jszip";
import { base64EncodeUtf8, HttpStatus, respond } from "@common";
import { generateRemark, generateWsPath, getConfigAddresses, randomUpperCase, resolveDNS } from "@utils";

export async function handleWebsocket(request: Request): Promise<Response> {
    const { pathName } = globalThis.globalConfig;
    const encodedPathConfig = pathName.replace("/", "");

    try {
        const { protocol, mode, panelIPs } = JSON.parse(atob(encodedPathConfig));
        globalThis.wsConfig = {
            ...globalThis.wsConfig,
            wsProtocol: protocol,
            proxyMode: mode,
            panelIPs: panelIPs
        };

        switch (protocol) {
            case 'vl':
                return await VlOverWSHandler(request);

            case 'tr':
                return await TrOverWSHandler(request);

            default:
                return await fallback(request);
        }

    } catch (error) {
        return new Response('Failed to parse WebSocket path config', { status: HttpStatus.BAD_REQUEST });
    }
}

export async function handlePanel(request: Request, env: Env): Promise<Response> {
    const { pathName } = globalThis.globalConfig;

    switch (pathName) {
        case '/panel':
            return await renderPanel(request, env);

        case '/panel/settings':
            return await getSettings(request, env);

        case '/panel/update-settings':
            return await updateSettings(request, env);

        case '/panel/reset-settings':
            return await resetSettings(request, env);

        case '/panel/reset-password':
            return await resetPassword(request, env);

        case '/panel/my-ip':
            return await getMyIP(request);

        case '/panel/update-warp':
            return await updateWarpConfigs(request, env);

        case '/panel/get-warp-configs':
            return await getWarpConfigs(request, env);

        default:
            return await fallback(request);
    }
}

export async function handleProxyIPs(request: Request, env: Env): Promise<Response> {
    const auth = await Authenticate(request, env);

    if (!auth) {
        const { urlOrigin } = globalThis.httpConfig;
        return Response.redirect(`${urlOrigin}/login`, 302);
    }

    const { pathName } = globalThis.globalConfig;

    switch (pathName) {
        case '/proxy-ip':
            return await renderProxyIPs();

        case '/proxy-ip/get':
            return await getProxyIPsInfo();

        default:
            return await fallback(request);
    }
}

export async function renderError(error: any): Promise<Response> {
    const message = error instanceof Error ? error.message : String(error);
    const html = await decompressHtml(__ERROR_HTML_CONTENT__, true) as string;
    const errorPage = html.replace('__ERROR_MESSAGE__', message);

    return new Response(errorPage, {
        status: HttpStatus.OK,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

async function renderProxyIPs() {
    const html = await decompressHtml(__PROXY_IP_HTML_CONTENT__, false);
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
    const { pathName } = globalThis.globalConfig;

    if (pathName === '/login') {
        return await renderLogin(request, env);
    }

    if (pathName === '/login/authenticate') {
        return await generateJWTToken(request, env);
    }

    return await fallback(request);
}

export function logout(): Response {
    return respond(true, HttpStatus.OK, 'Successfully logged out!', null, {
        'Set-Cookie': 'jwtToken=; Secure; SameSite=None; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'Content-Type': 'text/plain'
    });
}

export async function handleSubscriptions(request: Request, env: Env): Promise<Response> {
    await setSettings(request, env);
    const {
        globalConfig: { pathName },
        httpConfig: { client, subPath }
    } = globalThis;

    switch (pathName) {
        case `/sub/normal/${subPath}`:
            switch (client) {
                case 'xray':
                    return await getXrCustomConfigs(false);

                case 'sing-box':
                    return await getSbCustomConfig(false);

                case 'clash':
                    return await getClNormalConfig();

                default:
                    break;
            }

        case `/sub/raw/${subPath}`:
            switch (client) {
                case 'xray':
                case 'sing-box':
                    return await getURLConfigs();

                default:
                    break;
            }

        case `/sub/fragment/${subPath}`:
            switch (client) {
                case 'xray':
                    return await getXrCustomConfigs(true);

                case 'sing-box':
                    return await getSbCustomConfig(true);

                default:
                    break;
            }

        case `/sub/warp/${subPath}`:
            switch (client) {
                case 'xray':
                    return await getXrWarpConfigs(request, env, false, false);

                case 'sing-box':
                    return await getSbWarpConfig(request, env);

                case 'clash':
                    return await getClWarpConfig(request, env, false);

                default:
                    break;
            }

        case `/sub/warp-pro/${subPath}`:
            switch (client) {
                case 'xray':
                    return await getXrWarpConfigs(request, env, true, false);

                case 'xray-knocker':
                    return await getXrWarpConfigs(request, env, true, true);

                case 'clash':
                    return await getClWarpConfig(request, env, true);

                default:
                    break;
            }

        default:
            return await fallback(request);
    }
}

async function updateSettings(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'PUT') {
        return respond(false, HttpStatus.METHOD_NOT_ALLOWED, 'Method not allowed.');
    }

    const auth = await Authenticate(request, env);

    if (!auth) {
        return respond(false, HttpStatus.UNAUTHORIZED, 'Unauthorized or expired session.');
    }

    const proxySettings = await updateDataset(request, env);
    return respond(true, HttpStatus.OK, '', proxySettings);
}

async function resetSettings(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
        return respond(false, HttpStatus.METHOD_NOT_ALLOWED, 'Method not allowed!');
    }

    const auth = await Authenticate(request, env);

    if (!auth) {
        return respond(false, HttpStatus.UNAUTHORIZED, 'Unauthorized or expired session.');
    }

    try {
        const { settings } = globalThis;
        await env.kv.put("proxySettings", JSON.stringify(settings));
        return respond(true, HttpStatus.OK, '', settings);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(error);
        throw new Error(`An error occurred while updating KV: ${message}`);
    }
}

async function getSettings(request: Request, env: Env): Promise<Response> {
    const isPassSet = Boolean(await env.kv.get('pwd'));
    const auth = await Authenticate(request, env);

    if (!auth) {
        return respond(false, HttpStatus.UNAUTHORIZED, 'Unauthorized or expired session.', { isPassSet });
    }

    const dataset = await getDataset(request, env);
    const { subPath } = globalThis.httpConfig;

    const data = {
        proxySettings: dataset.settings,
        isPassSet,
        subPath: subPath
    };

    return respond(true, HttpStatus.OK, undefined, data);
}

export async function fallback(request: Request): Promise<Response> {
    const { fallbackDomain } = globalThis.globalConfig;
    const { url, method, headers, body } = request;

    const newURL = new URL(url);
    newURL.hostname = fallbackDomain;
    newURL.protocol = 'https:';
    const newRequest = new Request(newURL.toString(), {
        method,
        headers,
        body,
        redirect: 'manual'
    });

    return await fetch(newRequest);
}

async function getMyIP(request: Request): Promise<Response> {
    const ip = await request.text();

    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?nocache=${Date.now()}`);
        const geoLocation = await response.json();

        return respond(true, HttpStatus.OK, '', geoLocation);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error fetching IP address:', error);
        return respond(false, HttpStatus.INTERNAL_SERVER_ERROR, `Error fetching IP address: ${message}`)
    }
}

async function getWarpConfigs(request: Request, env: Env): Promise<Response> {
    const {
        httpConfig: { client },
        dict: { _project_ }
    } = globalThis;

    const isPro = client === 'amnezia';
    const auth = await Authenticate(request, env);

    if (!auth) {
        return new Response('Unauthorized or expired session.', { status: HttpStatus.UNAUTHORIZED });
    }

    const { warpAccounts, settings } = await getDataset(request, env);
    const { warpIPv6, publicKey, privateKey } = warpAccounts[0];
    const {
        warpEndpoints,
        warpRemoteDNS,
        amneziaNoiseCount,
        amneziaNoiseSizeMin,
        amneziaNoiseSizeMax
    } = settings;

    const zip = new JSZip();
    const trimLines = (str: string) => str.split("\n").map(line => line.trim()).join("\n");

    try {
        warpEndpoints?.forEach((endpoint, index) => {
            const config =
                `[Interface]
                PrivateKey = ${privateKey}
                Address = 172.16.0.2/32, ${warpIPv6}
                DNS = ${warpRemoteDNS}
                MTU = 1280
                ${isPro ?
                    `Jc = ${amneziaNoiseCount}
                    Jmin = ${amneziaNoiseSizeMin}
                    Jmax = ${amneziaNoiseSizeMax}
                    S1 = 0
                    S2 = 0
                    H1 = 0
                    H2 = 0
                    H3 = 0
                    H4 = 0`
                    : ''
                }
                [Peer]
                PublicKey = ${publicKey}
                AllowedIPs = 0.0.0.0/0, ::/0
                Endpoint = ${endpoint}
                PersistentKeepalive = 25`;

            zip.file(`${_project_}-Warp-${index + 1}.conf`, trimLines(config));
        });

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const arrayBuffer = await zipBlob.arrayBuffer();

        return new Response(arrayBuffer, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${_project_}-Warp-${isPro ? "Pro-" : ""}configs.zip"`,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new Response(`Error generating ZIP file: ${message}`, { status: HttpStatus.INTERNAL_SERVER_ERROR });
    }
}

async function getProxyIPsInfo(): Promise<Response> {
    const ips = await resolveDNS(globalThis.dict._public_proxy_ip_, true);
    const geoLocInfo = await geoLookupBatch(ips.ipv4);
    return respond(true, HttpStatus.OK, undefined, geoLocInfo);
}

export async function serveIcon(): Promise<Response> {
    const faviconBase64 = __ICON__;
    const body = Uint8Array.from(atob(faviconBase64), c => c.charCodeAt(0));

    return new Response(body, {
        headers: {
            'Content-Type': 'image/x-icon',
            'Cache-Control': 'public, max-age=86400',
        }
    });
}

async function renderPanel(request: Request, env: Env): Promise<Response> {
    const pwd = await env.kv.get('pwd');

    if (pwd) {
        const auth = await Authenticate(request, env);
        if (!auth) {
            const { urlOrigin } = globalThis.httpConfig;
            return Response.redirect(`${urlOrigin}/login`, 302);
        }
    }

    const html = await decompressHtml(__PANEL_HTML_CONTENT__, false);
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

async function renderLogin(request: Request, env: Env): Promise<Response> {
    const auth = await Authenticate(request, env);
    if (auth) {
        const { urlOrigin } = globalThis.httpConfig;
        return Response.redirect(`${urlOrigin}/panel`, 302);
    }

    const html = await decompressHtml(__LOGIN_HTML_CONTENT__, false);
    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    });
}

export async function renderSecrets(): Promise<Response> {
    const html = await decompressHtml(__SECRETS_HTML_CONTENT__, false);
    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    });
}

async function updateWarpConfigs(request: Request, env: Env): Promise<Response> {
    if (request.method === 'POST') {
        const auth = await Authenticate(request, env);

        if (!auth) {
            return respond(false, HttpStatus.UNAUTHORIZED, 'Unauthorized.');
        }

        try {
            await fetchWarpAccounts(env);
            return respond(true, HttpStatus.OK, 'Warp configs updated successfully!');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.log(error);
            return respond(false, HttpStatus.INTERNAL_SERVER_ERROR, `An error occurred while updating Warp configs: ${message}`);
        }
    }

    return respond(false, HttpStatus.METHOD_NOT_ALLOWED, 'Method not allowed.');
}

async function decompressHtml(content: string, asString: boolean): Promise<string | ReadableStream<Uint8Array>> {
    const bytes = Uint8Array.from(atob(content), c => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));

    if (asString) {
        const decompressedArrayBuffer = await new Response(stream).arrayBuffer();
        const decodedString = new TextDecoder().decode(decompressedArrayBuffer);
        return decodedString;
    }

    return stream;
}

export async function handleDoH(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const { subPath } = globalThis.httpConfig;
    const { dohURL } = globalThis.globalConfig;

    if (url.pathname !== `/dns-query/${subPath}`) {
        return fallback(request);
    }

    const targetURL = new URL(dohURL);
    url.searchParams.forEach((value, key) => {
        targetURL.searchParams.set(key, value);
    });

    const proxyRequest = new Request(targetURL.toString(), request);
    return fetch(proxyRequest);
}

interface IpApiBatchResponse {
    query: string;
    city?: string;
    country?: string;
    countryCode?: string;
    isp?: string;
    status: "success" | "fail";
    message?: string;
}

interface GeoResult {
    ip: string;
    city?: string;
    country?: string;
    countryCode?: string;
    isp?: string;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }

    return chunks;
}

async function geoLookupBatch(ipList: string[]): Promise<GeoResult[]> {
    const batches = chunkArray(ipList, 100);
    const results: GeoResult[] = [];

    for (const batch of batches) {
        const res = await fetch(
            "http://ip-api.com/batch?fields=query,city,country,countryCode,isp,status",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(batch),
            }
        );

        if (!res.ok) {
            throw new Error(`ip-api request failed: ${res.status}`);
        }

        const data: IpApiBatchResponse[] = await res.json();

        for (const item of data) {
            if (item.status === "success") {
                results.push({
                    ip: item.query,
                    city: item.city,
                    country: item.country,
                    countryCode: item.countryCode,
                    isp: item.isp,
                });
            }
        }
    }

    return results;
}

export async function getURLConfigs() {
    const {
        globalConfig: { userID, TrPass },
        httpConfig: { defaultHttpsPorts, client, hostName },
        dict: { _VL_, _TR_, _project_ },
        settings: {
            fingerprint,
            ports,
            customCdnAddrs,
            customCdnHost,
            customCdnSni,
            VLConfigs,
            TRConfigs,
            outProxy,
            remoteDNS
        }
    } = globalThis;

    const buildConfig = (protocol: string, addr: string, port: number, host: string, sni: string, remark: string) => {
        const isTLS = defaultHttpsPorts.includes(port);
        const security = isTLS ? 'tls' : 'none';
        const config = new URL(`${protocol}://config`);

        if (protocol === _VL_) {
            config.username = userID;
            config.searchParams.append('encryption', 'none');
        } else {
            config.username = TrPass;
        }

        const path = generateWsPath(protocol);
        config.hostname = addr;
        config.port = port.toString();
        config.searchParams.append('host', host);
        config.searchParams.append('type', 'ws');
        config.searchParams.append('security', security);
        config.hash = remark;

        if (client === 'sing-box') {
            config.searchParams.append('eh', 'Sec-WebSocket-Protocol');
            config.searchParams.append('ed', '2560');
            config.searchParams.append('path', path);
        } else {
            config.searchParams.append('path', `${path}?ed=2560`);
        }

        if (isTLS) {
            config.searchParams.append('sni', sni);
            config.searchParams.append('fp', fingerprint);
            config.searchParams.append('alpn', 'http/1.1');
        }

        return config.href;
    }

    let VLConfs = '', TRConfs = '', chainProxy = '';
    let proxyIndex = 1;
    const addrs = await getConfigAddresses(false);

    ports.forEach(port => {
        addrs.forEach(addr => {
            const isCustomAddr = customCdnAddrs.includes(addr);
            const sni = isCustomAddr ? customCdnSni : randomUpperCase(hostName);
            const host = isCustomAddr ? customCdnHost : hostName;

            if (VLConfigs) {
                const remark = generateRemark(proxyIndex, port, addr, _VL_, false, false);
                const vlConfig = buildConfig(atob('dmxlc3M='), addr, port, host, sni, remark);
                VLConfs += `${vlConfig}\n`;
            }

            if (TRConfigs) {
                const remark = generateRemark(proxyIndex, port, addr, _TR_, false, false);
                const trConfig = buildConfig(atob('dHJvamFu'), addr, port, host, sni, remark);
                TRConfs += `${trConfig}\n`;
            }

            proxyIndex++;
        });
    });

    if (outProxy) {
        let chainRemark = `#${encodeURIComponent('💦 Chain proxy 🔗')}`;
        if (outProxy.startsWith('socks') || outProxy.startsWith('http')) {
            const regex = /^(?:socks|http):\/\/([^@]+)@/;
            const isUserPass = outProxy.match(regex);
            const userPass = isUserPass ? isUserPass[1] : false;
            chainProxy = userPass
                ? outProxy.replace(userPass, btoa(userPass)) + chainRemark
                : outProxy + chainRemark;
        } else {
            chainProxy = outProxy.split('#')[0] + chainRemark;
        }
    }

    const configs = btoa(VLConfs + TRConfs + chainProxy);
    return new Response(configs, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'CDN-Cache-Control': 'no-store',
            'Profile-Title': `base64:${base64EncodeUtf8(`💦 ${_project_} Raw`)}`,
            'DNS': remoteDNS
        }
    });
}

// ===== PART 3: COMMON FILE =====

export enum HttpStatus {
    OK = 200,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    METHOD_NOT_ALLOWED = 405,
    INTERNAL_SERVER_ERROR = 500
}

export function base64EncodeUtf8(str: string) {
    return btoa(
        String.fromCharCode(...new TextEncoder().encode(str))
    );
}

export function base64DecodeUtf8(base64: string) {
    return new TextDecoder().decode(
        Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    );
}

export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export function respond(
    success: boolean,
    status: HttpStatus,
    message?: string,
    body?: any,
    customHeaders?: Record<string, string>
): Response {
    const headers = {
        'Content-Type': 'application/json',
        ...customHeaders,
    };

    const responseBody = {
        success,
        status,
        message: message ?? null,
        body: body ?? null,
    };

    return new Response(JSON.stringify(responseBody), { status, headers });
}

// ===== PART 4: UTILS FILE =====

export function isDomain(address: string): boolean {
    if (!address) return false;
    const domainRegex = /^(?!-)(?:[A-Za-z0-9-]{1,63}.)+[A-Za-z]{2,}$/;
    return domainRegex.test(address);
}

export async function resolveDNS(domain: string, onlyIPv4 = false): Promise<DnsResult> {
    const dohBaseURL = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}`;
    const dohURLs = {
        ipv4: `${dohBaseURL}&type=A`,
        ipv6: `${dohBaseURL}&type=AAAA`,
    };

    try {
        const ipv4 = await fetchDNSRecords(dohURLs.ipv4, 1);
        const ipv6 = onlyIPv4 ? [] : await fetchDNSRecords(dohURLs.ipv6, 28);
        return { ipv4, ipv6 };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Error resolving DNS for ${domain}: ${message}`);
    }
}

export async function fetchDNSRecords(url: string, recordType: number): Promise<string[]> {
    try {
        const response = await fetch(url, { headers: { accept: 'application/dns-json' } });
        const data: any = await response.json();

        if (!data.Answer) return [];

        return data.Answer
            .filter((record: any) => record.type === recordType)
            .map((record: any) => record.data);

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch DNS records from ${url}: ${message}`);
    }
}

export function getProtocols() {
    const {
        settings: { VLConfigs, TRConfigs },
        dict: { _VL_, _TR_ }
    } = globalThis;

    return [].concatIf(VLConfigs, _VL_).concatIf(TRConfigs, _TR_);
}

export async function getConfigAddresses(isFragment: boolean): Promise<string[]> {
    const {
        httpConfig: { hostName },
        settings: { enableIPv6, customCdnAddrs, cleanIPs }
    } = globalThis;

    const { ipv4, ipv6 } = await resolveDNS(hostName, !enableIPv6);
    const addrs = [
        hostName,
        'www.speedtest.net',
        ...ipv4,
        ...ipv6.map((ip: string) => `[${ip}]`),
        ...cleanIPs
    ];

    return addrs.concatIf(!isFragment, customCdnAddrs);
}

export function generateRemark(
    index: number,
    port: number,
    address: string,
    protocol: string,
    isFragment: boolean,
    isChain: boolean
): string {
    const {
        settings: { cleanIPs, customCdnAddrs },
        dict: { _VL_, _VL_CAP_, _TR_CAP_ }
    } = globalThis;

    const isCustomAddr = customCdnAddrs.includes(address);
    const configType = isCustomAddr ? ' C' : isFragment ? ' F' : '';
    const chainSign = isChain ? '🔗 ' : '';
    const protoSign = protocol === _VL_ ? _VL_CAP_ : _TR_CAP_;
    let addressType;

    cleanIPs.includes(address)
        ? addressType = 'Clean IP'
        : addressType = isDomain(address) ? 'Domain' : isIPv4(address) ? 'IPv4' : isIPv6(address) ? 'IPv6' : '';

    return `💦 ${index} - ${chainSign}${protoSign}${configType} - ${addressType} : ${port}`;
}

export function randomUpperCase(str: string): string {
    let result = '';

    for (let i = 0; i < str.length; i++) {
        result += Math.random() < 0.5 ? str[i].toUpperCase() : str[i];
    }

    return result;
}

export function getRandomString(lengthMin: number, lengthMax: number): string {
    let result = '';
    const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * (lengthMax - lengthMin + 1)) + lengthMin;

    for (let i = 0; i < length; i++) {
        result += charSet.charAt(Math.floor(Math.random() * charSet.length));
    }

    return result;
}

export function generateWsPath(protocol: string): string {
    const {
        settings: { proxyIPMode, proxyIPs, prefixes },
        dict: { _VL_ }
    } = globalThis;

    const config = {
        junk: getRandomString(8, 16),
        protocol: protocol === _VL_ ? "vl" : "tr",
        mode: proxyIPMode,
        panelIPs: proxyIPMode === 'proxyip' ? proxyIPs : prefixes
    };

    return `/${btoa(JSON.stringify(config))}`;
}

export function base64ToDecimal(base64: string): number[] {
    const binaryString = atob(base64);
    const hexString = Array
        .from(binaryString)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');

    const decimalArray = hexString
        .match(/.{2}/g)!
        .map(hex => parseInt(hex, 16));

    return decimalArray;
}

export function isIPv4(address: string): boolean {
    const ipv4Pattern = /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
    return ipv4Pattern.test(address);
}

export function isIPv6(address: string): boolean {
    const ipv6Pattern = /^\[(?:(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,7}:|::(?:[a-fA-F0-9]{1,4}:){0,7}|(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}|(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}|(?:[a-fA-F0-9]{1,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}|(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}|(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}|[a-fA-F0-9]{1,4}:(?::[a-fA-F0-9]{1,4}){1,6})\](?:\/(1[0-1][0-9]|12[0-8]|[0-9]?[0-9]))?$/;
    return ipv6Pattern.test(address);
}

export function getDomain(url: string) {
    try {
        const newUrl = new URL(url);
        const host = newUrl.hostname;
        const isHostDomain = isDomain(host);

        return {
            host,
            isHostDomain
        };
    } catch {
        return {
            host: '',
            isHostDomain: false
        };
    }
}

export function selectSniHost(address: string) {
    const {
        httpConfig: { hostName },
        settings: { customCdnAddrs, customCdnHost, customCdnSni }
    } = globalThis;

    const isCustomAddr = customCdnAddrs.includes(address);
    const sni = isCustomAddr ? customCdnSni : randomUpperCase(hostName);
    const host = isCustomAddr ? customCdnHost : hostName;

    return { host, sni, allowInsecure: isCustomAddr };
}

export function parseHostPort(input: string, brackets?: boolean): { host: string, port: number } {
    const regex = /^(?:\[(?<ipv6>.+?)\]|(?<host>[^:]+))(:(?<port>\d+))?$/;
    const match = input.match(regex);

    if (!match || !match.groups) return { host: "", port: 0 };
    const { ipv6, host: plainHost, port: portStr } = match.groups;

    let host = ipv6 ?? plainHost ?? "";
    if (brackets && ipv6) host = `[${ipv6}]`;
    const port = portStr ? Number(portStr) : 0;

    return { host, port };
}

export function isHttps(port: number): boolean {
    const { defaultHttpsPorts } = globalThis.httpConfig;
    return defaultHttpsPorts.includes(port);
}

const isBypass = (type: string) => type === "direct";
const isBlock = (type: string) => type === "block";

export function accRoutingRules(geoAssets: GeoAsset[]) {
    const {
        customBypassRules,
        customBypassSanctionRules,
        customBlockRules
    } = globalThis.settings;

    return {
        bypass: {
            geosites: geoAssets
                .filter(rule => isBypass(rule.type))
                .map(rule => rule.geosite),
            geoips: geoAssets
                .filter(rule => isBypass(rule.type) && rule.geoip)
                .map(rule => rule.geoip!),
            domains: [
                ...customBypassRules.filter(isDomain),
                ...customBypassSanctionRules.filter(isDomain)
            ],
            ips: customBypassRules.filter(rule => !isDomain(rule))
        },
        block: {
            geosites: geoAssets
                .filter(rule => isBlock(rule.type))
                .map(rule => rule.geosite),
            geoips: geoAssets
                .filter(rule => isBlock(rule.type) && rule.geoip)
                .map(rule => rule.geoip!),
            domains: customBlockRules.filter(isDomain),
            ips: customBlockRules.filter(rule => !isDomain(rule))
        }
    };
}

export function accDnsRules(geoAssets: GeoAsset[]) {
    const {
        localDNS,
        antiSanctionDNS,
        customBypassRules,
        customBypassSanctionRules,
        customBlockRules
    } = globalThis.settings;

    return {
        bypass: {
            localDNS: {
                geositeGeoips: geoAssets
                    .filter(({ type, geoip, dns }) => isBypass(type) && geoip && dns === localDNS)
                    .map(({ geosite, geoip }) => ({ geosite, geoip })),
                geosites: geoAssets
                    .filter(({ type, geoip, dns }) => isBypass(type) && !geoip && dns === localDNS)
                    .map(rule => rule.geosite),
                domains: customBypassRules.filter(isDomain)
            },
            antiSanctionDNS: {
                geosites: geoAssets
                    .filter(rule => isBypass(rule.type) && rule.dns === antiSanctionDNS)
                    .map(rule => rule.geosite),
                domains: customBypassSanctionRules.filter(isDomain)
            }
        },
        block: {
            geosites: geoAssets
                .filter(rule => isBlock(rule.type))
                .map(rule => rule.geosite),
            domains: customBlockRules.filter(isDomain)
        }
    };
}

export function toRange(min?: number, max?: number) {
    if (!min || !max) return undefined;
    if (min === max) return String(min);
    return `${min}-${max}`;
}

Array.prototype.concatIf = function <T>(condition: boolean, concat: T | T[]): T[] {
    if (!condition) return this;
    if (Array.isArray(concat)) return [...this, ...concat];
    return [...this, concat]
}

Object.prototype.omitEmpty = function <T>(): T | undefined {
    if (Object.keys(this).length === 0) return undefined;
    return this as T;
}