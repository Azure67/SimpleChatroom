# encoding:utf-8
import socket
import _thread
from datetime import datetime
import sys
import time

# 日志文件路径
LOG_FILE_PATH = "proxy_log.txt"

# 开启日志的全局变量
LOGGING_ENABLED = False

def log_message(message):
    """
    将日志信息写入文件
    :param message:
    """
    global LOGGING_ENABLED
    if LOGGING_ENABLED:
        with open(LOG_FILE_PATH, "a") as log_file:
            log_file.write(message + "\n")

def get_log_format(client_ip, header, status_code, body_size):
    """
    生成日志格式字符串
    """
    current_time = datetime.now().strftime('%d/%b/%Y %H:%M:%S')
    method, url, http_version = header.header_list[0].decode('utf-8').split(' ')
    host_port = url.split(':')[-1] if ':' in url else (url.split('/')[2] + ':' + str(80 if method != 'CONNECT' else 443))
    log_line = f"{client_ip} - - [{current_time}] \"{header.get_method().decode('utf-8')} {url} {http_version}\" {status_code} {body_size} \"-\" \"-\""
    return log_line

class Header:
    """
    用于读取和解析头信息
    """

    def __init__(self, conn):
        self._method = None
        header = b''
        try:
            while 1:
                data = conn.recv(4096)
                header += data
                if header.endswith(b'\r\n\r\n') or (not data):
                    break
        except:
            pass
        self._header = header
        self.header_list = header.split(b'\r\n')
        self._host = None
        self._port = None

    def get_method(self):
        """
        获取请求方式
        :return:
        """
        if self._method is None:
            self._method = self._header[:self._header.index(b' ')]
        return self._method

    def get_host_info(self):
        """
        获取目标主机的ip和端口
        :return:
        """
        if self._host is None:
            method = self.get_method()
            line = self.header_list[0].decode('utf8')
            if method == b"CONNECT":
                host = line.split(' ')[1]
                if ':' in host:
                    host, port = host.split(':')
                else:
                    port = 443
            else:
                for i in self.header_list:
                    if i.startswith(b"Host:"):
                        host = i.split(b" ")[1].decode('utf8')
                        break
                else:
                    host = line.split('/')[2]
                if ':' in host:
                    host, port = host.split(':')
                else:
                    port = 80
            self._host = host
            self._port = int(port)
        return self._host, self._port

    @property
    def data(self):
        """
        返回头部数据
        :return:
        """
        return self._header

    def is_ssl(self):
        """
        判断是否为 https协议
        :return:
        """
        if self.get_method() == b'CONNECT':
            return True
        return False

    def __repr__(self):
        return str(self._header.decode("utf8"))


def communicate(sock1, sock2, header):
    """
    socket之间的数据交换
    :param sock1:
    :param sock2:
    :param header: Header对象
    :return:
    """
    try:
        body_size = 0
        while 1:
            data = sock1.recv(1024)
            if not data:
                break
            sock2.sendall(data)
            body_size += len(data)
        status_code = '200' if body_size > 0 else '400'
        if LOGGING_ENABLED:
            log_message(get_log_format(sock1.getpeername()[0], header, status_code, body_size))
        else:
            print(get_log_format(sock1.getpeername()[0], header, status_code, body_size))
    except:
        pass


def handle(client):
    """
    处理连接进来的客户端
    :param client:
    :return:
    """
    timeout = 60
    client.settimeout(timeout)
    header = Header(client)
    if not header.data:
        client.close()
        return
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        server.connect(header.get_host_info())
        server.settimeout(timeout)
        if header.is_ssl():
            data = b"HTTP/1.0 200 Connection Established\r\n\r\n"
            client.sendall(data)
            _thread.start_new_thread(communicate, (client, server, header))
        else:
            server.sendall(header.data)
        communicate(server, client, header)
    except Exception as e:
        if LOGGING_ENABLED:
            log_message(get_log_format(client.getpeername()[0], header, '400', '0'))
        else:
            print(get_log_format(client.getpeername()[0], header, '400', '0'))
        server.close()
        client.close()


def serve(ip, port):
    """
    代理服务
    :param ip:
    :param port:
    :return:
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((ip, port))
        s.listen(10)
        # 向父进程发送成功信号
        print(f"PROXY_STARTED:{ip}:{port}")
        sys.stdout.flush()
        
        while True:
            conn, addr = s.accept()
            _thread.start_new_thread(handle, (conn,))
    except Exception as e:
        print(f"PROXY_ERROR:{str(e)}")
        sys.stdout.flush()
        sys.exit(1)


if __name__ == '__main__':
    try:
        print("代理脚本启动...")
        sys.stdout.flush()

        print("等待输入配置...")
        sys.stdout.flush()
        
        # 从标准输入读取选项和端口
        auto_ip = sys.stdin.readline().strip()
        print(f"收到IP选项: {auto_ip}")
        sys.stdout.flush()
        
        port = int(sys.stdin.readline().strip())
        print(f"收到端口: {port}")
        sys.stdout.flush()
        
        if auto_ip == "1":
            IP = socket.gethostbyname(socket.gethostname())
            print(f"自动获取IP: {IP}")
        else:
            IP = "127.0.0.1"
            print(f"使用默认IP: {IP}")
        sys.stdout.flush()
            
        print(f"正在启动代理服务器...")
        sys.stdout.flush()
        serve(IP, port)
    except Exception as e:
        print(f"STARTUP_ERROR:{str(e)}")
        sys.stdout.flush()
        sys.exit(1)