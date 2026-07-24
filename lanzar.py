#!/usr/bin/env python3
"""Abre Mentes Brillantes en el navegador con un servidor local."""

from __future__ import annotations

import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser


def carpeta_juego() -> str:
    if getattr(sys, "frozen", False):
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass and os.path.isfile(os.path.join(meipass, "index.html")):
            return meipass
        base = os.path.dirname(sys.executable)
        candidato = os.path.abspath(os.path.join(base, "..", "Resources"))
        if os.path.isfile(os.path.join(candidato, "index.html")):
            return candidato
        return base
    return os.path.dirname(os.path.abspath(__file__))


def puerto_libre() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def ventana_salida(httpd: socketserver.TCPServer) -> None:
    """Ventana para cerrar el juego (útil en .app / .exe sin consola)."""
    try:
        import tkinter as tk
    except Exception:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        return

    root = tk.Tk()
    root.title("Mentes Brillantes")
    root.geometry("360x140")
    root.resizable(False, False)

    tk.Label(
        root,
        text="El juego está abierto en el navegador.\nCierra esta ventana para detenerlo.",
        padx=16,
        pady=20,
        justify="center",
    ).pack()

    def al_cerrar() -> None:
        httpd.shutdown()
        root.destroy()

    tk.Button(root, text="Cerrar juego", command=al_cerrar).pack(pady=8)
    root.protocol("WM_DELETE_WINDOW", al_cerrar)

    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    root.mainloop()


def main() -> None:
    root = carpeta_juego()
    index = os.path.join(root, "index.html")
    if not os.path.isfile(index):
        print(f"No se encontró index.html en:\n{root}")
        input("Pulsa Enter para cerrar...")
        sys.exit(1)

    os.chdir(root)
    port = puerto_libre()
    handler = http.server.SimpleHTTPRequestHandler
    handler.log_message = lambda *args, **kwargs: None  # type: ignore[method-assign]

    httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
    url = f"http://127.0.0.1:{port}/"
    print("Sistema Mentes Brillantes")
    print(f"Abriendo: {url}")
    print("Cierra la ventana del launcher para detener el juego.\n")
    threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    ventana_salida(httpd)


if __name__ == "__main__":
    main()
