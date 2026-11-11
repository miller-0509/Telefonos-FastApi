const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const USDC = (value) => ethers.parseUnits(value.toString(), 6);
const orderRef = (orderNumber) => ethers.keccak256(ethers.toUtf8Bytes(orderNumber));
const DAY = 24 * 60 * 60;

async function deployFixture() {
  const [funder, buyer, seller, arbiter, other] = await ethers.getSigners();

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();

  const PhoneEscrow = await ethers.getContractFactory("PhoneEscrow");
  const escrow = await PhoneEscrow.deploy(await usdc.getAddress(), arbiter.address);
  await escrow.waitForDeployment();

  // El árbitro es admin por constructor; habilitamos además al fondo de la tienda.
  await escrow.connect(arbiter).grantRole(await escrow.FUNDER_ROLE(), funder.address);

  await usdc.mint(funder.address, USDC(10_000));
  await usdc.connect(funder).approve(await escrow.getAddress(), USDC(10_000));

  return { usdc, escrow, funder, buyer, seller, arbiter, other };
}

async function fundedFixture() {
  const ctx = await deployFixture();
  const ref = orderRef("ORD-ABCD1234");
  const deadline = (await time.latest()) + 7 * DAY;
  await ctx.escrow
    .connect(ctx.funder)
    .fundEscrow(ref, ctx.buyer.address, ctx.seller.address, USDC(1_500), deadline);
  return { ...ctx, ref, deadline };
}

describe("MockUSDC", function () {
  it("usa 6 decimales y permite acuñar solo al owner", async function () {
    const { usdc, other } = await loadFixture(deployFixture);
    expect(await usdc.decimals()).to.equal(6);
    await expect(usdc.connect(other).mint(other.address, USDC(1))).to.be.revertedWithCustomError(
      usdc,
      "OwnableUnauthorizedAccount"
    );
  });
});

describe("PhoneEscrow", function () {
  describe("Fondeo", function () {
    it("custodia los USDC y registra el escrow", async function () {
      const { usdc, escrow, funder, buyer, seller } = await loadFixture(deployFixture);
      const ref = orderRef("ORD-ABCD1234");
      const deadline = (await time.latest()) + 7 * DAY;

      await expect(
        escrow.connect(funder).fundEscrow(ref, buyer.address, seller.address, USDC(1_500), deadline)
      )
        .to.emit(escrow, "EscrowFunded")
        .withArgs(ref, buyer.address, seller.address, USDC(1_500), deadline);

      const data = await escrow.getEscrow(ref);
      expect(data.buyer).to.equal(buyer.address);
      expect(data.seller).to.equal(seller.address);
      expect(data.amount).to.equal(USDC(1_500));
      expect(data.deadline).to.equal(deadline);
      expect(data.status).to.equal(1); // Funded

      expect(await escrow.totalEscrowed()).to.equal(USDC(1_500));
      expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(USDC(1_500));
      expect(await usdc.balanceOf(funder.address)).to.equal(USDC(8_500));
    });

    it("rechaza una orden duplicada", async function () {
      const { escrow, funder, buyer, seller, ref, deadline } = await loadFixture(fundedFixture);
      await expect(
        escrow.connect(funder).fundEscrow(ref, buyer.address, seller.address, USDC(10), deadline)
      ).to.be.revertedWithCustomError(escrow, "EscrowAlreadyExists");
    });

    it("rechaza montos en cero y fechas pasadas", async function () {
      const { escrow, funder, buyer, seller } = await loadFixture(deployFixture);
      const ref = orderRef("ORD-ZERO");
      const future = (await time.latest()) + DAY;

      await expect(
        escrow.connect(funder).fundEscrow(ref, buyer.address, seller.address, 0, future)
      ).to.be.revertedWithCustomError(escrow, "InvalidAmount");

      await expect(
        escrow.connect(funder).fundEscrow(ref, buyer.address, seller.address, USDC(1), 1)
      ).to.be.revertedWithCustomError(escrow, "InvalidDeadline");
    });

    it("solo un funder puede depositar", async function () {
      const { escrow, other, buyer, seller } = await loadFixture(deployFixture);
      const ref = orderRef("ORD-NOPE");
      const deadline = (await time.latest()) + DAY;

      await expect(
        escrow.connect(other).fundEscrow(ref, buyer.address, seller.address, USDC(1), deadline)
      ).to.be.revertedWithCustomError(escrow, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Liberación", function () {
    it("el comprador puede liberar los fondos al vendedor", async function () {
      const { usdc, escrow, buyer, seller, ref } = await loadFixture(fundedFixture);
      const sellerBefore = await usdc.balanceOf(seller.address);

      await expect(escrow.connect(buyer).release(ref))
        .to.emit(escrow, "EscrowReleased")
        .withArgs(ref, seller.address, USDC(1_500));

      expect(await usdc.balanceOf(seller.address)).to.equal(sellerBefore + USDC(1_500));
      expect((await escrow.getEscrow(ref)).status).to.equal(2); // Released
      expect(await escrow.totalEscrowed()).to.equal(0);
    });

    it("el árbitro puede liberar los fondos", async function () {
      const { usdc, escrow, arbiter, seller, ref } = await loadFixture(fundedFixture);
      const sellerBefore = await usdc.balanceOf(seller.address);

      await escrow.connect(arbiter).release(ref);

      expect(await usdc.balanceOf(seller.address)).to.equal(sellerBefore + USDC(1_500));
    });

    it("un tercero no puede liberar y no se puede liberar dos veces", async function () {
      const { escrow, buyer, other, ref } = await loadFixture(fundedFixture);

      await expect(escrow.connect(other).release(ref)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );

      await escrow.connect(buyer).release(ref);
      await expect(escrow.connect(buyer).release(ref)).to.be.revertedWithCustomError(
        escrow,
        "EscrowNotFunded"
      );
    });
  });

  describe("Reembolso", function () {
    it("el vendedor puede reembolsar al comprador", async function () {
      const { usdc, escrow, buyer, seller, ref } = await loadFixture(fundedFixture);
      const buyerBefore = await usdc.balanceOf(buyer.address);

      await expect(escrow.connect(seller).refund(ref))
        .to.emit(escrow, "EscrowRefunded")
        .withArgs(ref, buyer.address, USDC(1_500));

      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + USDC(1_500));
      expect((await escrow.getEscrow(ref)).status).to.equal(3); // Refunded
    });

    it("el árbitro puede reembolsar en cualquier momento", async function () {
      const { usdc, escrow, arbiter, buyer, ref } = await loadFixture(fundedFixture);
      const buyerBefore = await usdc.balanceOf(buyer.address);

      await escrow.connect(arbiter).refund(ref);

      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + USDC(1_500));
    });

    it("el comprador solo puede reclamar después del deadline", async function () {
      const { escrow, buyer, ref, deadline } = await loadFixture(fundedFixture);

      await expect(escrow.connect(buyer).refund(ref)).to.be.revertedWithCustomError(
        escrow,
        "NotAuthorized"
      );

      await time.increaseTo(deadline);
      await expect(escrow.connect(buyer).refund(ref)).to.emit(escrow, "EscrowRefunded");
    });

    it("no se puede liberar un escrow reembolsado", async function () {
      const { escrow, buyer, arbiter, ref } = await loadFixture(fundedFixture);
      await escrow.connect(arbiter).refund(ref);
      await expect(escrow.connect(buyer).release(ref)).to.be.revertedWithCustomError(
        escrow,
        "EscrowNotFunded"
      );
    });
  });
});
