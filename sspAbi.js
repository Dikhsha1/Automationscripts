export const sspAbi = [
{
type: 'function',
name: 'dagrToken',
inputs: [],
outputs: [{ name: '', type: 'address', internalType: 'address' }],
stateMutability: 'view',
},
{
type: 'function',
name: 'stablecoin',
inputs: [],
outputs: [{ name: '', type: 'address', internalType: 'address' }],
stateMutability: 'view',
},
{
type: 'function',
name: 'stablecoinDecimals',
inputs: [],
outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
stateMutability: 'view',
},
{
type: 'function',
name: 'token0',
inputs: [],
outputs: [{ name: '', type: 'address', internalType: 'address' }],
stateMutability: 'view',
},
{
type: 'function',
name: 'token1',
inputs: [],
outputs: [{ name: '', type: 'address', internalType: 'address' }],
stateMutability: 'view',
},
{
type: 'function',
name: 'getReserves',
inputs: [],
outputs: [
{ name: 'reserve0', type: 'uint112', internalType: 'uint112' },
{ name: 'reserve1', type: 'uint112', internalType: 'uint112' },
{ name: 'blockTimestampLast', type: 'uint32', internalType: 'uint32' },
],
stateMutability: 'view',
},
{
type: 'function',
name: 'getPriceInUSDT',
inputs: [],
outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
stateMutability: 'view',
},
{
type: 'function',
name: 'getAmountsOut',
inputs: [
{ name: 'amountIn', type: 'uint256', internalType: 'uint256' },
{ name: 'path', type: 'address[]', internalType: 'address[]' },
{ name: 'user', type: 'address', internalType: 'address' },
],
outputs: [{ name: 'amounts', type: 'uint256[]', internalType: 'uint256[]' }],
stateMutability: 'view',
},
{
type: 'function',
name: 'getAmountsIn',
inputs: [
{ name: 'amountOut', type: 'uint256', internalType: 'uint256' },
{ name: 'path', type: 'address[]', internalType: 'address[]' },
{ name: 'user', type: 'address', internalType: 'address' },
],
outputs: [{ name: 'amounts', type: 'uint256[]', internalType: 'uint256[]' }],
stateMutability: 'view',
},
{
type: 'function',
name: 'swap',
inputs: [
{ name: 'amount0Out', type: 'uint256', internalType: 'uint256' },
{ name: 'amount1Out', type: 'uint256', internalType: 'uint256' },
{ name: 'to', type: 'address', internalType: 'address' },
{ name: 'data', type: 'bytes', internalType: 'bytes' },
],
outputs: [],
stateMutability: 'nonpayable',
},
{
type: 'function',
name: 'swapExactTokensForTokens',
inputs: [
{ name: 'amountIn', type: 'uint256', internalType: 'uint256' },
{ name: 'amountOutMin', type: 'uint256', internalType: 'uint256' },
{ name: 'path', type: 'address[]', internalType: 'address[]' },
{ name: 'to', type: 'address', internalType: 'address' },
{ name: 'deadline', type: 'uint256', internalType: 'uint256' },
],
outputs: [{ name: 'amounts', type: 'uint256[]', internalType: 'uint256[]' }],
stateMutability: 'nonpayable',
},
{
type: 'function',
name: 'swapTokensForExactTokens',
inputs: [
{ name: 'amountOut', type: 'uint256', internalType: 'uint256' },
{ name: 'amountInMax', type: 'uint256', internalType: 'uint256' },
{ name: 'path', type: 'address[]', internalType: 'address[]' },
{ name: 'to', type: 'address', internalType: 'address' },
{ name: 'deadline', type: 'uint256', internalType: 'uint256' },
],
outputs: [{ name: 'amounts', type: 'uint256[]', internalType: 'uint256[]' }],
stateMutability: 'nonpayable',
},
]



