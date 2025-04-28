export const Clanker_v3_1_abi = [
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: 'string', name: 'name', type: 'string' },
              { internalType: 'string', name: 'symbol', type: 'string' },
              { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
              { internalType: 'string', name: 'image', type: 'string' },
              { internalType: 'string', name: 'metadata', type: 'string' },
              { internalType: 'string', name: 'context', type: 'string' },
              { internalType: 'uint256', name: 'originatingChainId', type: 'uint256' },
            ],
            internalType: 'struct IClanker.TokenConfig',
            name: 'tokenConfig',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'uint8', name: 'vaultPercentage', type: 'uint8' },
              { internalType: 'uint256', name: 'vaultDuration', type: 'uint256' },
            ],
            internalType: 'struct IClanker.VaultConfig',
            name: 'vaultConfig',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'address', name: 'pairedToken', type: 'address' },
              { internalType: 'int24', name: 'tickIfToken0IsNewToken', type: 'int24' },
            ],
            internalType: 'struct IClanker.PoolConfig',
            name: 'poolConfig',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'uint24', name: 'pairedTokenPoolFee', type: 'uint24' },
              { internalType: 'uint256', name: 'pairedTokenSwapAmountOutMinimum', type: 'uint256' },
            ],
            internalType: 'struct IClanker.InitialBuyConfig',
            name: 'initialBuyConfig',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'uint256', name: 'creatorReward', type: 'uint256' },
              { internalType: 'address', name: 'creatorAdmin', type: 'address' },
              { internalType: 'address', name: 'creatorRewardRecipient', type: 'address' },
              { internalType: 'address', name: 'interfaceAdmin', type: 'address' },
              { internalType: 'address', name: 'interfaceRewardRecipient', type: 'address' },
            ],
            internalType: 'struct IClanker.RewardsConfig',
            name: 'rewardsConfig',
            type: 'tuple',
          },
        ],
        internalType: 'struct IClanker.DeploymentConfig',
        name: 'deploymentConfig',
        type: 'tuple',
      },
    ],
    name: 'deployToken',
    outputs: [
      { internalType: 'address', name: 'tokenAddress', type: 'address' },
      { internalType: 'uint256', name: 'positionId', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const; 