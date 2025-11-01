all: routing pre cri k8s-pkgs

routing:
	echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-k8s.conf
	echo 'net.ipv6.conf.all.forwarding=1' | sudo tee -a /etc/sysctl.d/99-k8s.conf
	sudo sysctl --system

pre:
	sudo apt update
	sudo apt install -y apt-transport-https ca-certificates curl gpg

cri:
	sudo apt install -y containerd
	sudo mkdir -p /etc/containerd
	containerd config default | sudo tee /etc/containerd/config.toml
	sudo sed -i 's/^\(\s*SystemdCgroup = \).*/\1true/' /etc/containerd/config.toml
	sudo sed -i 's/^\(\s*sandbox_image = \).*/\1"registry.k8s.io\/pause:3.10"/' /etc/containerd/config.toml
	sudo systemctl restart containerd

k8s-pkgs:
	curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.34/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
	echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.34/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
	sudo apt update
	sudo apt-get install -y kubelet kubeadm kubectl
	sudo apt-mark hold kubelet kubeadm kubectl
	sudo systemctl enable --now kubelet

k8s-init:
	kubeadm init --v=5 --control-plane-endpoint=k8s-0.sj.ifsc.edu.br --pod-network-cidr=10.0.0.0/16,fc00::/48 --service-cidr=10.1.0.0/16,fc00:1::/112
