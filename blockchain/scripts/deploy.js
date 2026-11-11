const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Desplegando con la cuenta: ${deployer.address}`);

  // 1. Stablecoin de prueba (USDC, 6 decimales)
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log(`MockUSDC desplegado en: ${usdcAddress}`);

  // 2. Contrato de escrow. El deployer será admin, funder y árbitro.
  const PhoneEscrow = await hre.ethers.getContractFactory("PhoneEscrow");
  const escrow = await PhoneEscrow.deploy(usdcAddress, deployer.address);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`PhoneEscrow desplegado en: ${escrowAddress}`);

  // 3. Fondeo de demostración: 1.000.000 USDC para el fondo de escrow
  const demoAmount = 1_000_000n * 10n ** 6n;
  const mintTx = await usdc.mint(deployer.address, demoAmount);
  await mintTx.wait();
  console.log(`Minteados ${demoAmount} unidades base de USDC a ${deployer.address}`);

  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  const deployment = {
    network: hre.network.name,
    chainId,
    deployer: deployer.address,
    usdc: usdcAddress,
    escrow: escrowAddress,
    demoUsdcMinted: demoAmount.toString(),
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const outputFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(deployment, null, 2) + "\n");

  console.log(`\nDeployment guardado en: ${outputFile}`);
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
