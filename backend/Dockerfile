FROM ghcr.io/steamdeckhomebrew/holo-toolchain-rust:latest

RUN pacman -Syu --noconfirm git dbus protobuf pkg-config && pacman -Scc --noconfirm

WORKDIR /build
RUN git clone --branch v0.1.8 --depth 1 https://github.com/qzed/pbpctrl.git .
RUN cargo build --release --bin pbpctrl

ENTRYPOINT ["cp", "/build/target/release/pbpctrl"]
CMD ["/out/pbpctrl"]
