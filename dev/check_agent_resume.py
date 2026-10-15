"""Exercise opening and closing the exact saved agent, without sending a task."""
import errno
import json
import os
import pty
import select
import signal
import sys
import termios
import time
import fcntl
import struct

identity = sys.argv[1]
pid, master = pty.fork()
if pid == 0:
    os.environ["TERM"] = "xterm-256color"
    os.execvp("codex", ["codex", "resume", identity, "--no-alt-screen"])
fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 45, 130, 0, 0))
content = b""
opened = False
status = None
deadline = time.monotonic() + 35
interrupted = False
try:
    while time.monotonic() < deadline:
        if select.select([master], [], [], .2)[0]:
            try:
                chunk = os.read(master, 65536)
            except OSError as exc:
                if exc.errno == errno.EIO:
                    break
                raise
            if not chunk:
                break
            content = (content + chunk)[-200000:]
            if b"\x1b[6n" in chunk:
                os.write(master, b"\x1b[1;1R")
            if b"\x1b[c" in chunk:
                os.write(master, b"\x1b[?1;2c")
            if any(marker in content for marker in (b"Ask Codex", b"context left", b"for shortcuts", b"ctrl", b"OpenAI Codex")):
                opened = True
        if opened and not interrupted:
            # Idle UI only. No request, credentials, or model work is submitted.
            time.sleep(1)
            os.write(master, b"\x03")
            time.sleep(.5)
            os.write(master, b"\x03")
            interrupted = True
        done, status = os.waitpid(pid, os.WNOHANG)
        if done:
            break
    else:
        os.kill(pid, signal.SIGTERM)
    try:
        done, final = os.waitpid(pid, 0)
        if done:
            status = final
    except ChildProcessError:
        pass
finally:
    os.close(master)
print(json.dumps({"session": identity, "interface_opened": opened, "interrupted_without_task": interrupted,
                  "session_identity_in_ui": identity.encode() in content, "exit_status": status}))
if not opened or not interrupted:
    sys.exit(1)
