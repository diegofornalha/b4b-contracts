import { ContractAddresses, TokenDecimals } from './types';
import addresses from '../addresses.json';
import decimals from '../decimals.json';

/**
 * Get addresses of contracts that have been deployed to the
 * Aurora mainnet or a supported testnet. Throws if there are
 * no known contracts deployed on the corresponding chain.
 * @param chainId The desired chainId
 */
export function getContractAddressesForChainOrThrow(chainId: number): ContractAddresses {
    const _addresses: Record<string, ContractAddresses> = addresses;
    if (!_addresses[chainId]) {
        throw new Error(`Unknown chain id (${chainId}). No known contracts have been deployed on this chain.`);
    }
    return _addresses[chainId];
}

/**
 * Get decimals of ERC-20 contracts that have been deployed to the
 * Aurora mainnet or a supported testnet. Throws if there are
 * no known contracts deployed on the corresponding chain.
 * @param chainId The desired chainId
 */
export function getTokenDecimalsForChainOrThrow(chainId: number): TokenDecimals {
    const _decimals: Record<string, TokenDecimals> = decimals;
    if (!_decimals[chainId]) {
        throw new Error(`Unknown chain id (${chainId}). No known contracts have been deployed on this chain.`);
    }
    return _decimals[chainId];
}
