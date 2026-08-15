APP := fforge
WAILS := wails

# On Linux, Wails defaults to the webkit2gtk-4.0 API, but recent distros
# (Ubuntu 22.04+/24.04, Debian 12, Fedora 38+) only ship 4.1. Auto-detect
# and pass the matching build tag so `make build` just works.
ifeq ($(shell uname -s),Linux)
  ifeq ($(shell pkg-config --exists webkit2gtk-4.1 && echo yes),yes)
    LINUX_TAGS := -tags webkit2_41
  else
    LINUX_TAGS :=
  endif
else
  LINUX_TAGS :=
endif

.PHONY: dev build build-all clean frontend install-deps

# ---------- Development ----------
dev:
	$(WAILS) dev

# ---------- Frontend only (useful for iterating on UI in a browser) ----------
frontend:
	cd frontend && npm run dev

install-deps:
	cd frontend && npm install

# ---------- Native build for the host OS ----------
build:
	$(WAILS) build $(LINUX_TAGS)

# ---------- Platform-specific builds (run on the respective host) ----------
build-linux:
	$(WAILS) build -platform linux/amd64 $(LINUX_TAGS)

build-mac:
	$(WAILS) build -platform darwin/universal

build-windows:
	$(WAILS) build -platform windows/amd64

# ---------- Generate Wails JS bindings after changing Go method signatures ----------
generate:
	$(WAILS) generate module

clean:
	rm -rf frontend/dist build/bin $(APP) *.syso
