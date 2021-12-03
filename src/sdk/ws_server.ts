import moment from 'moment'

// 处理网络长连接
export default class WSServer {
    // 单例模式
    private static wsServer: WSServer
    // ws入口地址
    private wsURL: string
    // token 
    private token: string
    // WebSocket
    private ws!: WebSocket
    // 是否已经调用run()
    private isRun: boolean = false
    // 心跳间隔
    private heartbeatTimeInterval: number = 50 * 1000
    // 上次重连时间
    private lastConnectTime: number = 0
    // 重连间隔
    private reconnectTimeInterval: number = 5 * 1000
    // 事件处理器
    private eventHandler: (event: string) => void

    private constructor(wsURL: string, token: string, eventHandler: (event: string) => void) {
        this.wsURL = wsURL
        this.token = token
        this.eventHandler = eventHandler
    }

    public static newWSServer(wsURL: string, token: string, eventHandler: (event: string) => void) {
        if (this.wsServer === undefined) {
            this.wsServer = new WSServer(wsURL, token, eventHandler)
        }
        return this.wsServer
    }

    // 开始连接
    public run() {
        // 如果已经启动
        if (this.isRun) {
            throw new Error("WSServer is running")
        }
        this.isRun = true
        this.connect()
        this.handleHeartbeat()
    }

    // 发送消息
    public sendMsg(msg: string) {
        // 连接必须打开
        if (!this.isOpen()) {
            throw new Error("WsServer not open")
        }

        // 发送消息
        this.ws.send(msg)
    }

    // 判断连接是否正常
    public isOpen(): boolean {
        if (this.ws !== undefined && this.ws.readyState === WebSocket.OPEN) {
            return true
        }
        return false
    }

    // 判断是否是连接中
    public isConnecting(): boolean {
        if (this.ws !== undefined && (this.ws.readyState === WebSocket.CONNECTING)) {
            return true
        }
        return false
    }

    // 连接
    private connect() {
        // 如果已经打开或正在打开则抛出异常
        if (this.isConnecting() || this.isOpen()) {
            throw new Error("WsServer has been open or openning")
        }

        // 建立新的WebSocket
        this.lastConnectTime = moment().valueOf()
        new Promise((resolve, reject) => {
            this.ws = new WebSocket(`${this.wsURL}?Token=${this.token}`)
            this.ws.onopen = () => {
                console.log("websocket open " + moment().toLocaleString())
            }
            this.ws.onmessage = (e) => {
                this.handleEvent(e.data)
            }
            this.ws.onclose = (e) => {
                reject("websocket close " + e)
            }
            this.ws.onerror = (e) => {
                reject("websocket error " + e)
            }
        }).catch(e => {
            this.handleReconnect()
        })
    }

    // 处理重连
    private handleReconnect() {
        const now = moment().valueOf()
        setTimeout(() => {
            if (this.isOpen() || this.isConnecting()) {
                return
            }
            this.connect()
        }, Math.max(now - this.lastConnectTime, this.reconnectTimeInterval))
    }

    // 处理心跳
    private handleHeartbeat() {
        setInterval(() => {
            try {
                if (this.isOpen()) {
                    this.ping()
                }
            } catch (e) {
                console.error("ping error " + e)
            }
        }, this.heartbeatTimeInterval)
    }

    // 处理事件
    private handleEvent(data: string) {
        this.eventHandler(data)
    }

    // ping 请求
    private ping() {
        console.log("ping " + moment().toLocaleString())
        this.sendMsg('')
    }
}