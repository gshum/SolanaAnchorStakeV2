const assert = require("assert");
const anchor = require("@project-serum/anchor");
const { Program } = require("@project-serum/anchor");
const splToken = require('@solana/spl-token');
const { Account, SystemProgram } = anchor.web3;
const { web3, LAMPORTS_PER_SOL } = require('@solana/web3.js');
describe("basic-3", () => {
  const provider = anchor.Provider.local();


  // Configure the client to use the local cluster.
  anchor.setProvider(provider);
  let mint = null;
  const fromWallet = anchor.web3.Keypair.generate();
  const toWallet = anchor.web3.Keypair.generate();
  const puppetMaster = anchor.workspace.PuppetMaster;
  let toTokenAccount = null;
  const AmountStake = 400;
  let pdaMintxBump;

  it('Test Set Up', async () => {
    // Airdrop sol to user1
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(fromWallet.publicKey, LAMPORTS_PER_SOL),
      "confirmed"
    );
  });

  it("Creates token and mints to toWallet token account", async () => {

    const puppet = anchor.workspace.Puppet;


    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(fromWallet.publicKey, LAMPORTS_PER_SOL),
      "confirmed"
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(toWallet.publicKey, LAMPORTS_PER_SOL),
      "confirmed"
    );


    mint = await splToken.Token.createMint(
      provider.connection,
      fromWallet,
      fromWallet.publicKey,
      null,
      9,
      splToken.TOKEN_PROGRAM_ID,
    );

    rewardmint = await splToken.Token.createMint(
      provider.connection,
      fromWallet,
      fromWallet.publicKey,
      null,
      9,
      splToken.TOKEN_PROGRAM_ID,
    );

    toTokenAccount = await mint.createAccount(fromWallet.publicKey);
// Minting 1 new token to the "fromTokenAccount" account we just returned/created
let signature = await mint.mintTo(
  toTokenAccount,
  fromWallet.publicKey,
  [fromWallet],
  1000000000,
);
const test1 = await mint.getAccountInfo(toTokenAccount);
console.log("Owner Wallet: ", fromWallet.publicKey)
console.log("Mint Signature: ", test1);

let amount = (await mint.getAccountInfo(toTokenAccount)).amount.toNumber();
    console.log("User1 Token A Amount: ", amount);
// Sign transaction, broadcast, and confirm

  });

  it('Initialize Staking Vault PDA', async () => {
    [pdaStakeVaultTokenAddress, pdaStakeVaultTokenBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("depo-vault"), mint.publicKey.toBuffer()],
      puppetMaster.programId);
      [pdaxmintTokenAddress, pdaMintxBump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("x-mint"), mint.publicKey.toBuffer()],
        puppetMaster.programId);
      await provider.connection.confirmTransaction(
      await puppetMaster.rpc.createDepositVault(
        pdaStakeVaultTokenBump, {
          accounts: {
            stakeVault: pdaStakeVaultTokenAddress,
            payer: fromWallet.publicKey,
            mint: mint.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: splToken.TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          },
          signers: [fromWallet]
      })
    );
    await provider.connection.confirmTransaction(
    await puppetMaster.rpc.initMint(
      pdaStakeVaultTokenBump, {
        accounts: {
          xMint: pdaxmintTokenAddress,
          stakeVault: pdaStakeVaultTokenAddress,
          payer: fromWallet.publicKey,
          mint: mint.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [fromWallet]
    })
  );
  [xMintAccount, pdaXMintBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("x-mint"), mint.publicKey.toBuffer()],
    puppetMaster.programId,
  );
  xMint = new splToken.Token(provider.connection, xMintAccount, splToken.TOKEN_PROGRAM_ID, fromWallet);
  userxTokenAAccount = await xMint.createAccount(fromWallet.publicKey);
    await provider.connection.confirmTransaction(
    await puppetMaster.rpc.stakeTokens(
      pdaMintxBump,
      new anchor.BN(AmountStake), {
        accounts: {
          xMint: pdaxmintTokenAddress,
          mint: mint.publicKey,
          stakeVault: pdaStakeVaultTokenAddress,
          staker: fromWallet.publicKey,
          stakerTokenAcct: toTokenAccount,
          stakerXTokenAccount: userxTokenAAccount,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
        },
        signers: [fromWallet]
    })
  );
  let pdaTokenAccountAmount = await (await mint.getAccountInfo(pdaStakeVaultTokenAddress)).amount.toNumber();
  console.log("Amount in stake account after tx:", pdaTokenAccountAmount);
});
});
