import 'dotenv/config';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const registryAddress = '0x6955af7cE14e21d6635630e86e07d1A2F76eB42A';
const sspAddress = process.env.SSP;

const registryAbi = [
  'function registrationFee() view returns (uint256)',
  'function userCounter() view returns (uint256)',
  'function getPriceInUSDT() view returns (uint256)',
  'function owner() view returns (address)',
  'function dagrToken() view returns (address)',
  'function stablecoin() view returns (address)',
  'function regUserV2(string referral,string username,uint256 dagrAmount)'
];

const sspAbi = [
  'function getPriceInUSDT() view returns (uint256)',
  'function dagrToken() view returns (address)',
  'function stablecoin() view returns (address)',
  'function stablecoinDecimals() view returns (uint8)',
  'function getReserves() view returns (uint112,uint112,uint32)'
];

async function main() {
  console.log('Registry address:', registryAddress);
  const code = await provider.getCode(registryAddress);
  console.log('Registry code length:', code.length);
  console.log('Registry code prefix:', code.slice(0, 32));

  const registry = new ethers.Contract(registryAddress, registryAbi, provider);

  for (const fn of ['registrationFee','userCounter','getPriceInUSDT','owner','dagrToken','stablecoin']) {
    try {
      const value = await registry[fn]();
      console.log(fn, value.toString());
    } catch (error) {
      console.log(fn, 'ERROR', error.reason || error.message || error);
    }
  }

  if (sspAddress) {
    console.log('SSP address:', sspAddress);
    const ssp = new ethers.Contract(sspAddress, sspAbi, provider);
    for (const fn of ['getPriceInUSDT','dagrToken','stablecoin','stablecoinDecimals']) {
      try {
        const value = await ssp[fn]();
        console.log('SSP', fn, value.toString());
      } catch (error) {
        console.log('SSP', fn, 'ERROR', error.reason || error.message || error);
      }
    }
  } else {
    console.log('SSP_ADDRESS missing in .env');
  }

  const iface = new ethers.Interface(registryAbi);
  const encoded = iface.encodeFunctionData('regUserV2', ['dipika', 'dipika07', ethers.parseUnits('8.09921750724772', 18)]);
  console.log('regUserV2 selector:', iface.getSighash('regUserV2(string,string,uint256)'));
  console.log('encoded regUserV2 data prefix:', encoded.slice(0, 10));
  try {
    const result = await provider.call({ to: registryAddress, data: encoded });
    console.log('provider.call result:', result);
  } catch (error) {
    console.log('provider.call error:', error.reason || error.message || error);
  }
}

main().catch((error) => {
  console.error('SCRIPT ERROR', error);
  process.exit(1);
});