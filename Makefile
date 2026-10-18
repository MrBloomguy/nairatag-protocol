.PHONY: help doctor start stop restart status logs rpc chain-id test deploy smoke-test blockscout-start blockscout-stop blockscout-smoke-test

SHELL := /bin/bash
ENV_FILE ?= config/development.env

help:
	@echo "NairaTag Network — OP Stack Ethereum L2 Rollup"
	@echo "==============================================="
	@echo "Available commands:"
	@echo "  make doctor                 - Validate dependencies (Docker, Foundry, Node)"
	@echo "  make start                  - Start local Anvil L1, NairaTag L2, and Blockscout"
	@echo "  make stop                   - Stop the running devnet & Blockscout"
	@echo "  make restart                - Restart the devnet & Blockscout"
	@echo "  make status                 - Report network status (L1, L2, Sequencer, Batcher, Blockscout)"
	@echo "  make logs                   - Follow devnet service logs"
	@echo "  make rpc                    - Print L1 and L2 RPC endpoints"
	@echo "  make chain-id               - Query live L2 chain ID from running node"
	@echo "  make test                   - Run contract unit tests (Foundry)"
	@echo "  make deploy                 - Deploy NairaTag contracts to active L2"
	@echo "  make smoke-test             - Execute core network verification suite"
	@echo "  make blockscout-start       - Launch Blockscout explorer containers"
	@echo "  make blockscout-stop        - Stop Blockscout explorer containers"
	@echo "  make blockscout-smoke-test  - Verify Blockscout indexing & L2 connectivity"

doctor:
	@bash scripts/doctor.sh

start:
	@bash scripts/start.sh

stop:
	@bash scripts/stop.sh

restart: stop start

status:
	@bash scripts/status.sh

logs:
	@bash scripts/logs.sh

rpc:
	@bash scripts/rpc.sh

chain-id:
	@bash scripts/chain-id.sh

test:
	@bash scripts/test-contracts.sh

deploy:
	@bash scripts/deploy-contracts.sh

smoke-test:
	@bash scripts/smoke-test.sh

blockscout-start:
	@docker compose -f blockscout/docker-compose.yml up -d

blockscout-stop:
	@docker compose -f blockscout/docker-compose.yml down

blockscout-smoke-test:
	@bash scripts/blockscout-smoke-test.sh
