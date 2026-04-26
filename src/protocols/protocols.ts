// ============================================
// BPB PANEL - COMPLETE PROTOCOLS FILE
// Merged: VLESS + Trojan + Common + Warp
// Version: 4.1.3
// ============================================

import { isValidUUID } from '@common';
import {
    safeCloseTcpSocket,
    handleTCPOutBound,
    makeReadableWebSocketStream,
    WS_READY_STATE_OPEN
} from './common';

export async function VlOverWSHandler(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, webSocket] = Object.values(webSocketPair);
    webSocket.accept();

    let address = "";
    let portWithRandomLog = "";

    const log = (info: string, event?: string) => {
        console.log(`[${address}:${portWithRandomLog}] ${info}`, event || "");
    };

    const earlyDataHeader = request.headers.get("sec-websocket-protocol") || "";
    const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);

    let remoteSocketWapper: { value: Socket | null } = { value: null };
    let udpStreamWrite: any = null;
    let isDns = false;

    const writableStream = new WritableStream({
        async write(chunk) {
            if (isDns && udpStreamWrite) {
                return udpStreamWrite(chunk);
            }

            if (remoteSocketWapper.value) {
                const writer = remoteSocketWapper.value.writable.getWriter();
                await writer.write(chunk);
                writer.releaseLock();
                return;
            }

            const { userID } = globalThis.globalConfig;
            const {
                hasError,
                message,
                portRemote = 443,
                addressRemote = "",
                rawDataIndex,
                VLVersion = new Uint8Array([0, 0]),
                isUDP,
            } = parseVlHeader(chunk, userID!);

            address = addressRemote;
            portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? "udp " : "tcp "} `;

            if (hasError) {
                throw new Error(message);
            }

            const VLResponseHeader = new Uint8Array([VLVersion[0], 0]);
            const rawClientData = chunk.slice(rawDataIndex);

            if (isUDP) {
                if (portRemote === 53) {
                    isDns = true;
                    const { write } = await handleUDPOutBound(webSocket, VLResponseHeader, log);
                    udpStreamWrite = write;
                    udpStreamWrite(rawClientData);
                    return;
                } else {
                    throw new Error("UDP proxy only enable for DNS which is port 53");
                }
            }

            handleTCPOutBound(
                remoteSocketWapper,
                addressRemote,
                portRemote,
                rawClientData,
                webSocket,
                VLResponseHeader,
                log
            );
        },
        close() {
            safeCloseTcpSocket(remoteSocketWapper.value);
        },
        abort(reason) {
            log(`readableWebSocketStream is abort`, JSON.stringify(reason));
        },
    });

    readableWebSocketStream
        .pipeTo(writableStream)
        .catch(error => {
            log("readableWebSocketStream pipeTo error", error);
            safeCloseTcpSocket(remoteSocketWapper.value);
        });

    return new Response(null, {
        status: 101,
        webSocket: client,
    });
}

function parseVlHeader(VLBuffer: ArrayBuffer, userID: string) {
    if (VLBuffer.byteLength < 24) {
        return {
            hasError: true,
            message: "invalid data",
        };
    }

    const version = new Uint8Array(VLBuffer.slice(0, 1));
    const slicedBuffer = new Uint8Array(VLBuffer.slice(1, 17));
    const slicedBufferString = stringify(slicedBuffer);
    const isValidUser = slicedBufferString === userID;

    if (!isValidUser) {
        return {
            hasError: true,
            message: "invalid user",
        };
    }

    const optLength = new Uint8Array(VLBuffer.slice(17, 18))[0];
    const command = new Uint8Array(VLBuffer.slice(18 + optLength, 18 + optLength + 1))[0];
    let isUDP = false;

    if (command === 1) {
    } else if (command === 2) {
        isUDP = true;
    } else {
        return {
            hasError: true,
            message: `command ${command} is not supported, command 01-tcp,02-udp,03-mux`,
        };
    }

    const portIndex = 18 + optLength + 1;
    const portBuffer = VLBuffer.slice(portIndex, portIndex + 2);
    const portRemote = new DataView(portBuffer).getUint16(0);

    let addressIndex = portIndex + 2;
    const addressBuffer = new Uint8Array(VLBuffer.slice(addressIndex, addressIndex + 1));
    const addressType = addressBuffer[0];
    let addressLength = 0;
    let addressValueIndex = addressIndex + 1;
    let addressValue = "";

    switch (addressType) {
        case 1:
            addressLength = 4;
            addressValue = new Uint8Array(VLBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(".");
            break;

        case 2:
            addressLength = new Uint8Array(VLBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
            addressValueIndex += 1;
            addressValue = new TextDecoder().decode(VLBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
            break;

        case 3: {
            addressLength = 16;
            const dataView = new DataView(VLBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
            const ipv6 = [];

            for (let i = 0; i < 8; i++) {
                ipv6.push(dataView.getUint16(i * 2).toString(16));
            }

            addressValue = ipv6.join(":");
            break;
        }
        default:
            return {
                hasError: true,
                message: `invalid addressType is ${addressType}`,
            };
    }

    if (!addressValue) {
        return {
            hasError: true,
            message: `addressValue is empty, addressType is ${addressType}`,
        };
    }

    return {
        hasError: false,
        addressRemote: addressValue,
        addressType,
        portRemote,
        rawDataIndex: addressValueIndex + addressLength,
        VLVersion: version,
        isUDP,
    };
}

function unsafeStringify(arr: Uint8Array, offset = 0) {
    const byteToHex: string[] = [];

    for (let i = 0; i < 256; ++i) {
        byteToHex.push((i + 256).toString(16).slice(1));
    }

    return (
        byteToHex[arr[offset + 0]] +
        byteToHex[arr[offset + 1]] +
        byteToHex[arr[offset + 2]] +
        byteToHex[arr[offset + 3]] +
        "-" +
        byteToHex[arr[offset + 4]] +
        byteToHex[arr[offset + 5]] +
        "-" +
        byteToHex[arr[offset + 6]] +
        byteToHex[arr[offset + 7]] +
        "-" +
        byteToHex[arr[offset + 8]] +
        byteToHex[arr[offset + 9]] +
        "-" +
        byteToHex[arr[offset + 10]] +
        byteToHex[arr[offset + 11]] +
        byteToHex[arr[offset + 12]] +
        byteToHex[arr[offset + 13]] +
        byteToHex[arr[offset + 14]] +
        byteToHex[arr[offset + 15]]
    ).toLowerCase();
}

function stringify(arr: Uint8Array, offset = 0) {
    const uuid = unsafeStringify(arr, offset);

    if (!isValidUUID(uuid)) {
        throw TypeError("Stringified UUID is invalid");
    }

    return uuid;
}

async function handleUDPOutBound(webSocket: WebSocket, VLResponseHeader: Uint8Array<ArrayBuffer>, log: Function) {
    let isVLHeaderSent = false;

    const transformStream = new TransformStream({
        start(_controller) { },
        transform(chunk, controller) {
            for (let index = 0; index < chunk.byteLength;) {
                const lengthBuffer = chunk.slice(index, index + 2);
                const udpPakcetLength = new DataView(lengthBuffer).getUint16(0);
                const udpData = new Uint8Array(chunk.slice(index + 2, index + 2 + udpPakcetLength));
                index = index + 2 + udpPakcetLength;
                controller.enqueue(udpData);
            }
        },
        flush(_controller) { },
    });

    transformStream.readable
        .pipeTo(
            new WritableStream({
                async write(chunk) {
                    const resp = await fetch("https://cloudflare-dns.com/dns-query", {
                        method: "POST",
                        headers: {
                            "content-type": "application/dns-message",
                        },
                        body: chunk
                    });

                    const dnsQueryResult = await resp.arrayBuffer();
                    const udpSize = dnsQueryResult.byteLength;
                    const udpSizeBuffer = new Uint8Array([(udpSize >> 8) & 0xff, udpSize & 0xff]);

                    if (webSocket.readyState === WS_READY_STATE_OPEN) {
                        log(`doh success and dns message length is ${udpSize}`);

                        if (isVLHeaderSent) {
                            webSocket.send(await new Blob([udpSizeBuffer, dnsQueryResult]).arrayBuffer());
                        } else {
                            webSocket.send(await new Blob([VLResponseHeader, udpSizeBuffer, dnsQueryResult]).arrayBuffer());
                            isVLHeaderSent = true;
                        }
                    }
                },
            })
        )
        .catch((error) => {
            log("dns udp has error" + error);
        });

    const writer = transformStream.writable.getWriter();

    return {
        write(chunk: ArrayBuffer) {
            writer.write(chunk);
        },
    };
}

// ===== TROJAN WEBSOCKET HANDLER =====

import {
    handleTCPOutBound,
    makeReadableWebSocketStream,
    safeCloseTcpSocket
} from './common';

export async function TrOverWSHandler(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, webSocket] = Object.values(webSocketPair);
    webSocket.accept();

    let address = "";
    let portWithRandomLog = "";

    const log = (info: string, event?: string) => {
        console.log(`[${address}:${portWithRandomLog}] ${info}`, event || "");
    };

    const earlyDataHeader = request.headers.get("sec-websocket-protocol") || "";
    const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);

    let remoteSocketWapper: { value: any } = { value: null };
    let udpStreamWrite: any = null;

    const writableStream = new WritableStream({
        async write(chunk, _controller) {
            if (udpStreamWrite) {
                return udpStreamWrite(chunk);
            }

            if (remoteSocketWapper.value) {
                const writer = remoteSocketWapper.value.writable.getWriter();
                await writer.write(chunk);
                writer.releaseLock();
                return;
            }

            const {
                hasError,
                message,
                portRemote = 443,
                addressRemote = "",
                rawClientData,
            } = parseTrHeader(chunk);

            address = addressRemote;
            portWithRandomLog = `${portRemote}--${Math.random()} tcp`;

            if (hasError) {
                throw new Error(message);
            }

            handleTCPOutBound(
                remoteSocketWapper,
                addressRemote,
                portRemote,
                rawClientData,
                webSocket,
                null,
                log
            );
        },
        close() {
            safeCloseTcpSocket(remoteSocketWapper.value);
        },
        abort(reason) {
            log(`readableWebSocketStream is aborted`, JSON.stringify(reason));
        }
    });

    readableWebSocketStream
        .pipeTo(writableStream)
        .catch(error => {
            log("readableWebSocketStream pipeTo error", error);
            safeCloseTcpSocket(remoteSocketWapper.value);
        });

    return new Response(null, {
        status: 101,
        webSocket: client,
    });
}

function parseTrHeader(buffer: ArrayBuffer) {
    if (buffer.byteLength < 56) {
        return {
            hasError: true,
            message: "invalid data",
        };
    }

    let crLfIndex = 56;
    const cr = new Uint8Array(buffer.slice(crLfIndex, crLfIndex + 1))[0];
    const lf = new Uint8Array(buffer.slice(crLfIndex + 1, crLfIndex + 2))[0];

    if (cr !== 0x0d || lf !== 0x0a) {
        return {
            hasError: true,
            message: "invalid header format (missing CR LF)",
        };
    }

    const password = new TextDecoder().decode(buffer.slice(0, crLfIndex));
    const { TrPass } = globalThis.globalConfig;

    if (password !== sha224(TrPass!)) {
        return {
            hasError: true,
            message: "invalid password",
        };
    }

    const socks5DataBuffer = buffer.slice(crLfIndex + 2);
    if (socks5DataBuffer.byteLength < 6) {
        return {
            hasError: true,
            message: "invalid SOCKS5 request data",
        };
    }

    const view = new DataView(socks5DataBuffer);
    const cmd = view.getUint8(0);
    if (cmd !== 1) {
        return {
            hasError: true,
            message: "unsupported command, only TCP (CONNECT) is allowed",
        };
    }

    const atype = view.getUint8(1);
    let addressLength = 0;
    let addressIndex = 2;
    let address = "";

    switch (atype) {
        case 1:
            addressLength = 4;
            address = new Uint8Array(socks5DataBuffer.slice(addressIndex, addressIndex + addressLength)).join(".");
            break;

        case 3:
            addressLength = new Uint8Array(socks5DataBuffer.slice(addressIndex, addressIndex + 1))[0];
            addressIndex += 1;
            address = new TextDecoder().decode(socks5DataBuffer.slice(addressIndex, addressIndex + addressLength));
            break;

        case 4: {
            addressLength = 16;
            const dataView = new DataView(socks5DataBuffer.slice(addressIndex, addressIndex + addressLength));
            const ipv6 = [];

            for (let i = 0; i < 8; i++) {
                ipv6.push(dataView.getUint16(i * 2).toString(16));
            }

            address = ipv6.join(":");
            break;
        }
        default:
            return {
                hasError: true,
                message: `invalid addressType is ${atype}`,
            };
    }

    if (!address) {
        return {
            hasError: true,
            message: `address is empty, addressType is ${atype}`,
        };
    }

    const portIndex = addressIndex + addressLength;
    const portBuffer = socks5DataBuffer.slice(portIndex, portIndex + 2);
    const portRemote = new DataView(portBuffer).getUint16(0);

    return {
        hasError: false,
        addressRemote: address,
        portRemote,
        rawClientData: socks5DataBuffer.slice(portIndex + 4),
    };
}

function sha224(string: string): string {
    const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));

    const h = [
        0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
        0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
    ];

    const k = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
        0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
        0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
        0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
        0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
        0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
        0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    const utf8Encode = (str: string) => {
        const utf8 = [];

        for (let i = 0; i < str.length; i++) {
            let charcode = str.charCodeAt(i);

            if (charcode < 0x80) {
                utf8.push(charcode);
            } else if (charcode < 0x800) {
                utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
            } else if (charcode < 0xd800 || charcode >= 0xe000) {
                utf8.push(
                    0xe0 | (charcode >> 12),
                    0x80 | ((charcode >> 6) & 0x3f),
                    0x80 | (charcode & 0x3f)
                );
            } else {
                i++;
                charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
                utf8.push(
                    0xf0 | (charcode >> 18),
                    0x80 | ((charcode >> 12) & 0x3f),
                    0x80 | ((charcode >> 6) & 0x3f),
                    0x80 | (charcode & 0x3f)
                );
            }
        }

        return utf8;
    };

    const bytes = utf8Encode(string);
    const bitLength = bytes.length * 8;

    bytes.push(0x80);

    while ((bytes.length % 64) !== 56) {
        bytes.push(0);
    }

    const lengthHi = Math.floor(bitLength / 0x100000000);
    const lengthLo = bitLength & 0xffffffff;

    for (let i = 3; i >= 0; i--) {
        bytes.push((lengthHi >> (i * 8)) & 0xff);
    }

    for (let i = 3; i >= 0; i--) {
        bytes.push((lengthLo >> (i * 8)) & 0xff);
    }

    for (let offset = 0; offset < bytes.length; offset += 64) {
        const w = new Array(64).fill(0);

        for (let i = 0; i < 16; i++) {
            w[i] =
                (bytes[offset + 4 * i] << 24) |
                (bytes[offset + 4 * i + 1] << 16) |
                (bytes[offset + 4 * i + 2] << 8) |
                bytes[offset + 4 * i + 3];
        }

        for (let i = 16; i < 64; i++) {
            const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }

        let [a, b, c, d, e, f, g, h8] = h;

        for (let i = 0; i < 64; i++) {
            const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h8 + S1 + ch + k[i] + w[i]) | 0;
            const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) | 0;

            h8 = g;
            g = f;
            f = e;
            e = (d + temp1) | 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) | 0;
        }

        h[0] = (h[0] + a) | 0;
        h[1] = (h[1] + b) | 0;
        h[2] = (h[2] + c) | 0;
        h[3] = (h[3] + d) | 0;
        h[4] = (h[4] + e) | 0;
        h[5] = (h[5] + f) | 0;
        h[6] = (h[6] + g) | 0;
        h[7] = (h[7] + h8) | 0;
    }

    return h
        .slice(0, 7)
        .map((word) => ('00000000' + (word >>> 0).toString(16)).slice(-8))
        .join('');
}

// ===== WEBSOCKET COMMON =====

import { connect } from 'cloudflare:sockets';
import { isIPv4, parseHostPort, resolveDNS } from '@utils';

export const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;

export async function handleTCPOutBound(
    remoteSocket: { value: Socket | null },
    addressRemote: string,
    portRemote: number,
    rawClientData: ArrayBuffer | undefined,
    webSocket: WebSocket,
    VLResponseHeader: Uint8Array<ArrayBuffer> | null,
    log: Function
) {
    async function connectAndWrite(address: string, port: number): Promise<Socket> {
        // if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(address)) address = `${atob('d3d3Lg==')}${address}${atob('LnNzbGlwLmlv')}`;
        const tcpSocket = connect({
            hostname: address,
            port: port,
        });

        remoteSocket.value = tcpSocket;
        log(`connected to ${address}:${port}`);
        const writer = tcpSocket.writable.getWriter();
        await writer.write(rawClientData);
        writer.releaseLock();
        return tcpSocket;
    }

    async function retry() {
        const {
            proxyMode,
            panelIPs,
            envProxyIPs,
            defaultProxyIPs,
            envPrefixes,
            defaultPrefixes
        } = globalThis.wsConfig;

        const getRandomValue = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
        const parseIPs = (value: string) => value ? value.split(',').map(val => val.trim()).filter(Boolean) : undefined;

        if (proxyMode === 'proxyip') {
            log(`direct connection failed, trying to use Proxy IP for ${addressRemote}`);
            const proxyIPs = panelIPs?.length ? panelIPs : parseIPs(envProxyIPs) ?? defaultProxyIPs;
            const proxyIP = getRandomValue(proxyIPs);
            const { host, port } = parseHostPort(proxyIP, true);
            addressRemote = host || addressRemote;
            portRemote = port || portRemote;
        } else if (proxyMode === 'prefix') {
            log(`direct connection failed, trying to generate dynamic prefix for ${addressRemote}`);
            const prefixes = panelIPs?.length ? panelIPs : parseIPs(envPrefixes) ?? defaultPrefixes;
            const prefix = getRandomValue(prefixes);
            const dynamicProxyIP = await getDynamicProxyIP(addressRemote, prefix);

            if (dynamicProxyIP) {
                addressRemote = dynamicProxyIP;
            } else {
                webSocket.close(1011, 'Retry connection failed: Invalid Prefix');
            }
        }

        try {
            const tcpSocket = await connectAndWrite(addressRemote, portRemote);
            tcpSocket.closed
                .catch(error => console.log('retry TCP socket closed error', error))
                .finally(() => safeCloseWebSocket(webSocket));

            remoteSocketToWS(tcpSocket, webSocket, VLResponseHeader, null, log);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Retry connection failed:', error);
            webSocket.close(1011, `Retry connection failed: ${message}`);
        }
    }

    try {
        const tcpSocket = await connectAndWrite(addressRemote, portRemote);
        remoteSocketToWS(tcpSocket, webSocket, VLResponseHeader, retry, log);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Connection failed: ${error}`);
        webSocket.close(1011, `Connection failed: ${message}`);
    }
}

async function remoteSocketToWS(
    remoteSocket: Socket,
    webSocket: WebSocket,
    VLResponseHeader: Uint8Array<ArrayBuffer> | null,
    retry: Function | null,
    log: Function
) {
    let vlHeader = VLResponseHeader;
    let hasIncomingData = false;

    const writableStream = new WritableStream({
        start() { },
        async write(chunk, controller) {
            hasIncomingData = true;
            if (webSocket.readyState !== WS_READY_STATE_OPEN) {
                controller.error("webSocket.readyState is not open, maybe close");
            }

            if (vlHeader) {
                webSocket.send(await new Blob([vlHeader, chunk]).arrayBuffer());
                vlHeader = null;
            } else {
                webSocket.send(chunk);
            }
        },
        close() {
            log(`remoteConnection.readable is close with hasIncomingData is ${hasIncomingData}`);
        },
        abort(reason) {
            console.error(`remoteConnection.readable abort`, reason);
            safeCloseTcpSocket(remoteSocket);
        }
    });

    try {
        await remoteSocket.readable.pipeTo(writableStream);
    } catch (error) {
        console.error('VLRemoteSocketToWS has exception.', error);
        safeCloseTcpSocket(remoteSocket);
        safeCloseWebSocket(webSocket);
    }

    if (hasIncomingData === false && retry) {
        log(`retry`);
        retry();
    }
}

export function makeReadableWebSocketStream(webSocketServer: WebSocket, earlyDataHeader: string, log: Function) {
    let readableStreamCancel = false;
    const stream = new ReadableStream({
        start(controller) {
            webSocketServer.addEventListener("message", (event) => {
                if (readableStreamCancel) return;
                const message = event.data;
                controller.enqueue(message);
            });

            webSocketServer.addEventListener("close", () => {
                safeCloseWebSocket(webSocketServer);
                if (readableStreamCancel) return;
                controller.close();
            });

            webSocketServer.addEventListener("error", (err) => {
                log("webSocketServer has error");
                controller.error(err);
            });

            const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);

            if (error) {
                controller.error(error);
            } else if (earlyData) {
                controller.enqueue(earlyData);
            }
        },
        pull(_controller) { },
        cancel(reason) {
            if (readableStreamCancel) return;
            log(`ReadableStream was canceled, due to ${reason}`);
            readableStreamCancel = true;
            safeCloseWebSocket(webSocketServer);
        }
    });

    return stream;
}

function base64ToArrayBuffer(base64Str: string) {
    if (!base64Str) {
        return { earlyData: null, error: null };
    }

    try {
        // go use modified Base64 for URL rfc4648 which js atob not support
        base64Str = base64Str.replace(/-/g, '+').replace(/_/g, '/');
        const decode = atob(base64Str);
        const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
        return { earlyData: arryBuffer.buffer, error: null };
    } catch (error) {
        return { earlyData: null, error };
    }
}

export function safeCloseTcpSocket(socket: Socket | null) {
    if (socket) {
        try {
            socket.close();
        } catch (error) {
            console.error("Failed to close TCP socket:", error);
        }
    }
}

export function safeCloseWebSocket(socket: WebSocket) {
    try {
        if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CLOSING) {
            socket.close();
        }
    } catch (error) {
        console.error('safeCloseWebSocket error', error);
    }
}

async function getDynamicProxyIP(address: string, prefix: string) {
    let finalAddress = address;

    if (!isIPv4(address)) {
        const { ipv4 } = await resolveDNS(address, true);

        if (ipv4.length) {
            finalAddress = ipv4[0];
        } else {
            throw new Error('Unable to find IPv4 in DNS records');
        }
    }

    return convertToNAT64IPv6(finalAddress, prefix);
}

function convertToNAT64IPv6(ipv4Address: string, prefix: string) {
    const parts = ipv4Address.split('.');

    if (parts.length !== 4) {
        throw new Error('Invalid IPv4 address');
    }

    const hex = parts.map(part => {
        const num = parseInt(part, 10);

        if (num < 0 || num > 255) {
            throw new Error('Invalid IPv4 address');
        }

        return num.toString(16).padStart(2, '0');
    });

    const match = prefix.match(/^\[([0-9A-Fa-f:]+)\]$/);

    if (match) {
        return `[${match[1]}${hex[0]}${hex[1]}:${hex[2]}${hex[3]}]`;
    }
}

// ===== WARP ACCOUNTS =====

interface WarpKeys {
    publicKey: string;
    privateKey: string;
}

export async function fetchWarpAccounts(env: Env): Promise<WarpAccount[]> {
    const WarpAccounts: WarpAccount[] = [];
    const apiBaseUrl = 'https://api.cloudflareclient.com/v0a4005/reg';
    const warpKeys = [
        await generateKeyPair(),
        await generateKeyPair()
    ];

    const fetchAccount = async (key: WarpKeys): Promise<any> => {
        try {
            const response = await fetch(apiBaseUrl, {
                method: 'POST',
                headers: {
                    'User-Agent': 'insomnia/8.6.1',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    install_id: "",
                    fcm_token: "",
                    tos: new Date().toISOString(),
                    type: "Android",
                    model: 'PC',
                    locale: 'en_US',
                    warp_enabled: true,
                    key: key.publicKey
                })
            });

            return await response.json();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to get warp configs: ${message}`);
        }
    };

    for (const key of warpKeys) {
        const { config } = await fetchAccount(key);
        WarpAccounts.push({
            privateKey: key.privateKey,
            warpIPv6: `${config.interface.addresses.v6}/128`,
            reserved: config.client_id,
            publicKey: config.peers[0].public_key
        });
    }

    await env.kv.put('warpAccounts', JSON.stringify(WarpAccounts));
    return WarpAccounts;
}

async function generateKeyPair(): Promise<WarpKeys> {
    const keyPair = await crypto.subtle.generateKey(
        { name: "X25519", namedCurve: "X25519" },
        true,
        ["deriveBits"]
    );

    const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyRaw = new Uint8Array(pkcs8).slice(-32);

    const publicKeyRaw = new Uint8Array(
        await crypto.subtle.exportKey("raw", keyPair.publicKey)
    );

    const base64Encode = (arr: Uint8Array) => btoa(String.fromCharCode(...arr));

    return {
        publicKey: base64Encode(publicKeyRaw),
        privateKey: base64Encode(privateKeyRaw)
    };
}
