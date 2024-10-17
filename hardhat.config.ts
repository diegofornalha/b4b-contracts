import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-packager";
import 'hardhat-abi-exporter';
import 'hardhat-docgen';
import '@openzeppelin/hardhat-upgrades';
import "@nomiclabs/hardhat-solhint";
import './tasks';

require('dotenv').config();

const AURORA_PRIVATE_KEY = process.env.AURORA_PRIVATE_KEY;
const AURORA_API_KEY = process.env.AURORA_API_KEY;

const AURORA_PLUS_URL = process.env.AURORA_PLUS_URL;
const AURORA_MAINNET_PRIVATE_KEY = process.env.AURORA_MAINNET_PRIVATE_KEY;

const BTTC_API_KEY = process.env.BTTC_API_KEY;

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 500,
          },
        },
    },
    networks: {
        localhost: {
            url: 'http://localhost:8545/'
        },
        // mainnet_aurora: {
        //     url: AURORA_PLUS_URL,
        //     accounts: [`0x${AURORA_MAINNET_PRIVATE_KEY}`],
        //     chainId: 1313161554
        // },
        testnet_goerli: {
            url: 'https://goerli.blockpi.network/v1/rpc/public',
            accounts: [`0x${AURORA_PRIVATE_KEY}`],
            chainId: 5,
            // gasPrice: 120 * 1000000000
        },
        testnet_linea: {
            url: 'https://rpc.goerli.linea.build',
            accounts: [`0x${AURORA_PRIVATE_KEY}`],
            chainId: 59140,
            // gasPrice: 120 * 1000000000
        },
        testnet_celo: {
            url: 'https://alfajores-forno.celo-testnet.org',
            accounts: [`0x${AURORA_PRIVATE_KEY}`],
            chainId: 44787,
            // gasPrice: 120 * 1000000000
        },
        testnet_neonevm: {
            url: 'https://proxy.devnet.neonlabs.org/solana',
            accounts: [`0x${AURORA_PRIVATE_KEY}`],
            chainId: 245022926,
            // gasPrice: 120 * 1000000000
        },
        testnet_polygon: {
            url: 'https://polygon-mumbai-bor.publicnode.com',
            accounts: [`0x${AURORA_PRIVATE_KEY}`],
            chainId: 80001,
            gasPrice: 30 * 1000000000
        },
        testnet_gnosis: {
            url: 'https://rpc.chiadochain.net',
            accounts: [`0x${AURORA_PRIVATE_KEY}`],
            chainId: 10200,
            gasPrice: 2 * 1000000000
        },
        testnet_base: {
            url: 'https://goerli.base.org',
            accounts: [`0x${AURORA_PRIVATE_KEY}`],
            chainId: 84531,
            gasPrice: 100000100
        }
    },
    etherscan: {
        apiKey: {
        //   neonevm: "test",
            testnet_celo: "F3BCF8ICSK6U5HXHWH8E4Y8QNZ8HCMTNAS"
        },
        customChains: [
          {
            network: "testnet_neonevm",
            chainId: 245022926,
            urls: {
              apiURL: "https://devnet-api.neonscan.org/hardhat/verify",
              browserURL: "https://devnet.neonscan.org"
            }
          },
          {
            network: "testnet_celo",
            chainId: 44787,
            urls: {
                apiURL: "https://api-alfajores.celoscan.io/api",
                browserURL: "https://alfajores.celoscan.io/"
            }
          }
        ]
    },
    packager: {
        contracts: [
          "B4B",
          "UniqueIdentity",
          "IERC20"
        ],
        includeFactories: false,
    },
    abiExporter: {
        path: './abi',
        runOnCompile: true,
        flat: true,
        clear: true,
        only: ["B4B", "UniqueIdentity", "IERC20"],
        format: "json"
    },
    docgen: {
        only: ["B4B"]
    }
};

export default config;
