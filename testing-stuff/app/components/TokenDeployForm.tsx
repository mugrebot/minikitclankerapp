'use client';

import { useState, useCallback, ChangeEvent } from "react";
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi';
import { base } from 'viem/chains';
import { useNotification, useOpenUrl } from '@coinbase/onchainkit/minikit';
import { Clanker } from 'clanker-sdk';

const DEFAULT_IMAGE = 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
const QUOTE = {
  WETH: '0x4200000000000000000000000000000000000006',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
} as const;

type QuoteToken = keyof typeof QUOTE | 'CUSTOM';

export default function TokenDeployForm() {
  const { address } = useAccount();
  const { data: wallet } = useWalletClient();
  const client = usePublicClient();
  const chainId = useChainId();
  const notify = useNotification();
  const openUrl = useOpenUrl();

  const [phase, setPhase] = useState<'idle'|'deploying'|'success'|'error'>('idle');
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

  const reset = () => {
    setPhase('idle');
    setAddr(null);
  };

  const handleDeploy = useCallback(async () => {
    if (!wallet || !client || !address) {
      notify({ title: 'Wallet Error', body: 'Please connect your wallet.' });
      return;
    }
    if (chainId !== base.id) {
      notify({ title: 'Network Error', body: 'Please switch to Base mainnet.' });
      return;
    }

    setPhase('deploying');
    setAddr(null);

    const clanker = new Clanker({ wallet, publicClient: client });

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
        ethAmount: f.devBuyEth || '0', // Assuming '0' is acceptable if no dev buy
      },
    };

    try {
      // Directly call deployToken and get the token address
      // We need to get the transaction hash separately if the SDK allows,
      // or acknowledge that we might not have it immediately for the first notification.
      // For now, we'll assume deployToken resolves after the transaction is confirmed
      // and might not directly give us the hash in a simple way.
      // The original code derived tokenAddr from logs, which implies onSuccess gave receipt.
      // Clanker SDK's deployToken returns the token address directly.

      const deployedTokenAddress = await clanker.deployToken(cfg);
      // To get the transaction hash, we would ideally get it from the clanker.deployToken response
      // or if clanker.deployToken waits for receipt, it might be part of an object it returns or an event it emits.
      // The previous code got hash from `r.transactionReceipts[0].transactionHash`
      // and tokenAddr from logs in `onStatus`.
      // Since clanker.deployToken returns the address, we use that.
      // We'll set a placeholder for txnHash for now for the notification.
      
      setAddr(deployedTokenAddress); // Set token address
      setPhase('success');

      // We don't have the transaction hash directly from clanker.deployToken in this simplified flow
      // We will notify with token address.
      await notify({
        title: 'Token deployed 🎉',
        body: `Token Address: ${deployedTokenAddress}. Remember to update your token metadata on clanker.world!`,
      });
      
      const castText = `I just deployed my new token ${f.name} (${f.symbol})! Check it out: ${deployedTokenAddress}`;
      let embedUrl = `https://basescan.org/address/${deployedTokenAddress}`; // Default to Basescan
      if (deployedTokenAddress) {
        embedUrl = `https://clanker.world/clanker/${deployedTokenAddress}`;
      }
      
      const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(embedUrl)}`;

      try {
        await openUrl(farcasterUrl);
        console.log('Attempted to open Farcaster composer.');
      } catch (error) {
        console.error('Failed to open Farcaster composer URL:', error);
        await notify({
          title: 'Share Failed',
          body: 'Could not open Farcaster composer.',
        });
      }

    } catch (error: unknown) {
      console.error('Deployment failed:', error);
      setPhase('error');
      let errorMessage = 'An unknown error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      await notify({
        title: 'Deployment Failed',
        body: errorMessage,
      });
    }
  }, [wallet, client, address, chainId, f, notify, openUrl]);

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

            <div className="flex flex-col justify-end space-y-2 col-span-2">
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
            {address ? (
              chainId === base.id ? (
                <button
                  onClick={handleDeploy}
                  disabled={phase === 'deploying'}
                  className="px-6 py-3 bg-[#ff9500] hover:bg-[#ffb84d] text-black font-medium rounded-lg transition-colors min-w-[200px] text-center cursor-pointer active:bg-[#cc7600] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {phase === 'deploying' ? 'Deploying...' : 
                   phase === 'success' ? 'Deployed!' :
                   phase === 'error' ? 'Try Again' :
                   'Deploy Token'}
                </button>
              ) : (
                <p className="text-[#ff9500]">Please switch to Base mainnet</p>
              )
            ) : (
              null // Or <ConnectWalletButton /> or similar
            )}
          </div>

          {phase === 'deploying' && (
            <p className="text-sm text-[#666] mt-4 text-center">
              Waiting for confirmations...
            </p>
          )}
          
          {/* Success message with token address and link */}
          {phase === 'success' && tokenAddr && (
            <div className="mt-4 text-center">
              <p className="text-[#00ff00] mb-2">Token successfully deployed!</p>
              <div className="text-[#666] break-all text-sm mb-4">
                Token Address: <a href={`https://basescan.org/address/${tokenAddr}`} target="_blank" rel="noopener noreferrer" className="text-[#00ff00] hover:underline">{tokenAddr}</a>
              </div>
              {/* Optional: Link to Clanker.world */}
              <div className="text-[#666] break-all text-sm mb-4">
                Manage on: <a href={`https://clanker.world/clanker/${tokenAddr}`} target="_blank" rel="noopener noreferrer" className="text-[#00ff00] hover:underline">clanker.world</a>
              </div>
              <button
                onClick={reset}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors mt-2"
              >
                Deploy Another
              </button>
            </div>
          )}

          {phase === 'error' && (
            <div className="mt-4 text-center">
              <p className="text-red-500 mb-2">Deployment Failed.</p>
              <button
                onClick={reset} // Or handleDeploy to retry with same form data
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
} 