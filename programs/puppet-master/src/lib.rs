// #region core
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use std::convert::TryInto;

declare_id!("HmbTLCmaGvZhKnn1Zfa1JVnp7vkMV4DYVxPLWBVoN65L");

#[program]
mod puppet_master {
    use super::*;
    pub fn init_mint(_ctx: Context<InitMint>, _bump: u8) -> ProgramResult {
        Ok(())
    }
    pub fn create_deposit_vault(_ctx: Context<InitDepoVault>, _bump: u8) -> ProgramResult {
        Ok(())
    }

    pub fn stake_tokens(ctx: Context<StakeTokens>, bump: u8, amount: u64) -> ProgramResult {
        let total_staked = ctx.accounts.stake_vault.amount;
        let total_x_tokens = ctx.accounts.x_mint.supply;
        let xamount;
        if total_staked ==0 || total_x_tokens ==0 {
            xamount = amount;
        } else {
            xamount = (amount as u128).checked_mul(total_x_tokens as u128).unwrap()
                .checked_div(total_staked as u128).unwrap()
                .try_into().unwrap();
        }
        let mint_key = ctx.accounts.mint.key();
        let seeds = &[b"x-mint", mint_key.as_ref(), &[bump]];

        let signer = &[&seeds[..]];

        token::transfer((&*ctx.accounts).into(), amount)?;
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.x_mint.to_account_info(),
                to: ctx.accounts.staker_x_token_account.to_account_info(),
                authority: ctx.accounts.x_mint.to_account_info(),
            },
            signer,
        );
        token::mint_to(cpi_context, xamount)?;
        Ok(())

    }
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitMint<'info> {
    #[account(init,
        payer = payer,
        mint::decimals = mint.decimals,
        mint::authority = x_mint,
        seeds = [b"x-mint", mint.key().as_ref()],
        bump,
    )]
    x_mint: Account<'info, Mint>,
    mint: Account<'info, Mint>,
    stake_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitDepoVault<'info> {
    #[account(init,
        payer = payer,
        seeds = [b"depo-vault", mint.key().as_ref()],
        bump = bump,
        token::mint = mint,
        token::authority = stake_vault)]
    pub stake_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct StakeTokens<'info> {
    #[account(mut,
        seeds = [b"depo-vault", staker_token_acct.mint.key().as_ref()],
        bump,)]
    pub stake_vault: Account<'info, TokenAccount>,
    pub staker: Signer<'info>,
    #[account(mut,
        seeds = [b"x-mint", mint.key().as_ref()],
        bump = bump)]
    pub x_mint: Account<'info, Mint>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub staker_token_acct: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    #[account(mut, constraint = staker_x_token_account.owner == staker.key())]
    pub staker_x_token_account: Account<'info, TokenAccount>,
}

impl<'info> From<&StakeTokens<'info>> for CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
    fn from(accounts: &StakeTokens<'info>) -> Self {
        let cpi_program = accounts.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: accounts.staker_token_acct.to_account_info(),
            to: accounts.stake_vault.to_account_info(),
            authority: accounts.staker.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}
// #endregion core
