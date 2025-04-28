'use client';

import { useState, useCallback, ChangeEvent } from "react";
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi';
import { base } from 'viem/chains';
import {
  Transaction, TransactionButton, TransactionStatus,
  TransactionStatusAction, TransactionStatusLabel,
  TransactionToast, TransactionToastIcon,
  TransactionToastLabel, TransactionToastAction,
  type LifecycleStatus, type TransactionError, type TransactionResponse,
} from '@coinbase/onchainkit/transaction';
import { useNotification } from '@coinbase/onchainkit/minikit';
import { Clanker } from 'clanker-sdk';
import type { Hex } from 'viem';

const DEFAULT_IMAGE = 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
const QUOTE = {
  WETH: '0x4200000000000000000000000000000000000006',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
} as const;

type QuoteToken = keyof typeof QUOTE | 'CUSTOM';

type Call = {
  to: Hex;
  data: Hex;
  value: bigint;
};

export default function TokenDeployForm() {
  const { address } = useAccount();
  const { data: wallet } = useWalletClient();
  const client = usePublicClient();
  const chainId = useChainId();
  const notify = useNotification();

  const [phase, setPhase] = useState<'idle'|'building'|'pending'|'success'|'error'>('idle');
  const [tokenAddr, setAddr] = useState<string | null>(null);

  const [f, setF] = useState({
    name: "",
    symbol: "",
    image: "",
    quote: "WETH" as QuoteToken,
    customQuoteToken: "",
    initialCap: "",
    devBuyEth: "",
    vaultPct: 0,
    vaultDays: 0,
  });

  const handle = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setF((prev) => ({ ...prev, [name]: value }));
  };

  const onStatus = useCallback((s: LifecycleStatus) => {
    setPhase(
      s.statusName === 'buildingTransaction' ? 'building' :
      s.statusName === 'transactionPending' ? 'pending' :
      s.statusName === 'success' ? 'success' :
      s.statusName === 'error' ? 'error' : 'idle'
    );
    if (s.statusName === 'success') {
      const sig = '0x6b04d68ca5c822b9c981d731c83ecb1356b96c8596c7659d397d234856a4537b';
      const receipt = s.statusData!.transactionReceipts[0];
      const log = receipt.logs.find(l => l.topics[0] === sig);
      if (log) setAddr(`0x${log.topics[1]?.slice(26)}`);
    }
  }, []);

  const onSuccess = useCallback(async (r: TransactionResponse) => {
    await notify({
      title: 'Token deployed 🎉',
      body: `Tx: ${r.transactionReceipts[0].transactionHash}`,
    });
  }, [notify]);

  const onError = useCallback((e: TransactionError) => {
    console.error('Deployment failed:', e);
  }, []);

  const reset = () => { setPhase('idle'); setAddr(null); };

  const buildCalls = async (): Promise<Call[]> => {
    if (!wallet || !client || !address) return [];

    const clanker = new Clanker({ wallet, publicClient: client });
    console.log("clanker is ready", clanker);

    const cfg = {
      name: f.name,
      symbol: f.symbol,
      image: f.image || DEFAULT_IMAGE,
      pool: {
        quoteToken: f.quote === 'CUSTOM'
          ? f.customQuoteToken as `0x${string}`
          : QUOTE[f.quote] as `0x${string}`,
        initialMarketCap: f.initialCap || '100',
      },
      vault: {
        percentage: +f.vaultPct,
        durationInDays: +f.vaultDays,
      },
      devBuy: {
        ethAmount: f.devBuyEth || '0',
      },
    };

    const tx = await clanker.prepareDeployToken(cfg);
    console.log('✅ prepared tx ↴\n', tx);
    return [{ ...tx }];
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      {!address ? (
        <div className="text-center py-4 text-[#666]">
          Connect your wallet to deploy a token
        </div>
      ) : (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-8 text-[#00ff00]">&gt; Deploy Token</h1>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Row 1 */}
            <div className="flex flex-col justify-end space-y-2">
              <label className="block text-[#666]">&gt; name</label>
              <input
                type="text"
                name="name"
                value={f.name}
                onChange={handle}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-[#00ff00] placeholder-[#666] focus:outline-none focus:border-[#00ff00] transition-colors"
                required
              />
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="block text-[#666]">&gt; symbol</label>
              <input
                type="text"
                name="symbol"
                value={f.symbol}
                onChange={handle}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-[#00ff00] placeholder-[#666] focus:outline-none focus:border-[#00ff00] transition-colors"
                required
              />
            </div>

            {/* Row 2 */}
            <div className="flex flex-col justify-end space-y-2">
              <div>
                <label className="block text-[#666]">&gt; image_url</label>
                <p className="text-xs text-[#666] mt-1">Format: ipfs://[CID]</p>
              </div>
              <input
                type="text"
                name="image"
                value={f.image}
                onChange={handle}
                placeholder="ipfs://..."
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-[#00ff00] placeholder-[#666] focus:outline-none focus:border-[#00ff00] transition-colors"
                pattern="^ipfs:\/\/[a-zA-Z0-9]+"
                required
              />
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="block text-[#666]">&gt; quote_token</label>
              <select
                name="quote"
                value={f.quote}
                onChange={handle}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-[#00ff00] focus:outline-none focus:border-[#00ff00] transition-colors appearance-none"
              >
                <option value="WETH">WETH</option>
                <option value="USDC">USDC</option>
                <option value="CUSTOM">Custom Token</option>
              </select>
            </div>

            {/* Row 3 */}
            <div className="flex flex-col justify-end space-y-2">
              <label className="block text-[#666]">&gt; initial_market_cap</label>
              <input
                type="text"
                name="initialCap"
                value={f.initialCap}
                onChange={handle}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-[#00ff00] placeholder-[#666] focus:outline-none focus:border-[#00ff00] transition-colors"
                required
              />
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="block text-[#666]">&gt; dev_buy_eth</label>
              <input
                type="text"
                name="devBuyEth"
                value={f.devBuyEth}
                onChange={handle}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-[#00ff00] placeholder-[#666] focus:outline-none focus:border-[#00ff00] transition-colors"
                required
              />
            </div>

            {/* Row 4 */}
            <div className="flex flex-col justify-end space-y-2">
              <label className="block text-[#666]">&gt; vault_percentage</label>
              <input
                type="number"
                name="vaultPct"
                value={f.vaultPct}
                onChange={handle}
                min="0"
                max="30"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-[#00ff00] placeholder-[#666] focus:outline-none focus:border-[#00ff00] transition-colors"
                required
              />
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="block text-[#666]">&gt; vault_duration_days</label>
              <input
                type="number"
                name="vaultDays"
                value={f.vaultDays}
                onChange={handle}
                min="0"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-[#00ff00] placeholder-[#666] focus:outline-none focus:border-[#00ff00] transition-colors"
                required
              />
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            {chainId === base.id ? (
              <Transaction
                chainId={base.id}
                calls={buildCalls}
                onStatus={onStatus}
                onSuccess={onSuccess}
                onError={onError}
              >
                <TransactionButton className="px-6 py-3 bg-[#ff9500] hover:bg-[#ffb84d] text-black font-medium rounded-lg transition-colors min-w-[200px] text-center cursor-pointer active:bg-[#cc7600] touch-manipulation" />
                <TransactionStatus>
                  <TransactionStatusAction />
                  <TransactionStatusLabel />
                </TransactionStatus>
                <TransactionToast>
                  <TransactionToastIcon />
                  <TransactionToastLabel />
                  <TransactionToastAction />
                </TransactionToast>
              </Transaction>
            ) : (
              <p className="text-[#ff9500]">Please switch to Base mainnet</p>
            )}
          </div>

          {phase === 'pending' && (
            <p className="text-sm text-[#666] mt-4 text-center">
              Waiting for confirmations...
            </p>
          )}

          {phase === 'error' && (
            <div className="mt-4 text-center">
              <button
                onClick={reset}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {phase === 'success' && tokenAddr && (
            <div className="mt-4 text-center">
              <p className="text-[#00ff00] mb-2">Token successfully deployed!</p>
              <div className="text-[#666] break-all text-sm mb-4">
                <p className="mb-2">Token address: {tokenAddr}</p>
                <a 
                  href={`https://clanker.world/clanker/${tokenAddr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ff9500] hover:text-[#ffb84d] transition-colors underline"
                >
                  View on Clanker.world →
                </a>
              </div>
              <button
                onClick={reset}
                className="mt-4 px-6 py-3 bg-[#00ff00] hover:bg-[#33ff33] text-black font-medium rounded-lg transition-colors"
              >
                Deploy Another Token
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
} 