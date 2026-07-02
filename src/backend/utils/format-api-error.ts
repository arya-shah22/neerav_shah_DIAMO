// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — API Error Formatter
// Converts Prisma / NestJS errors into user-friendly messages
// ═══════════════════════════════════════════════════════════════

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  UQ_account_groups_company_name:
    'An account group with this name already exists for this company. Choose a different name.',
  UQ_accounts_company_name:
    'An account with this name already exists for this company. Choose a different name.',
};

function messageFromHttpException(error: BadRequestException | ConflictException | NotFoundException): string {
  const response = error.getResponse();
  if (typeof response === 'string') return response;
  if (typeof response === 'object' && response && 'message' in response) {
    const msg = (response as { message: string | string[] }).message;
    return Array.isArray(msg) ? msg.join(', ') : msg;
  }
  return error.message;
}

function messageFromPrismaKnownError(error: Prisma.PrismaClientKnownRequestError): string {
  switch (error.code) {
    case 'P2002': {
      const constraint = typeof error.meta?.constraint === 'string' ? error.meta.constraint : undefined;
      if (constraint && UNIQUE_CONSTRAINT_MESSAGES[constraint]) {
        return UNIQUE_CONSTRAINT_MESSAGES[constraint];
      }
      const target = error.meta?.target;
      if (Array.isArray(target)) {
        if (target.includes('group_name') || target.includes('groupName')) {
          return UNIQUE_CONSTRAINT_MESSAGES.UQ_account_groups_company_name;
        }
        if (target.includes('account_name') || target.includes('accountName')) {
          return UNIQUE_CONSTRAINT_MESSAGES.UQ_accounts_company_name;
        }
      }
      return 'A record with the same value already exists. Please use a different name.';
    }
    case 'P2003': {
      const field = typeof error.meta?.field_name === 'string' ? error.meta.field_name : '';
      if (field.includes('account_group_id')) {
        return 'Cannot delete this group — accounts are still linked to it. Move or remove those accounts first.';
      }
      if (field.includes('parent_group_id')) {
        return 'Cannot delete this group — child groups are still linked to it. Delete or move child groups first.';
      }
      return 'This record is linked to another entry and cannot be deleted. Please remove dependent records first.';
    }
    case 'P2025':
      return 'The requested record was not found.';
    default:
      return 'A database error occurred. Please try again.';
  }
}

function messageFromRawError(message: string, fallback: string): string {
  if (message.includes('Unique constraint failed')) {
    for (const [constraint, friendly] of Object.entries(UNIQUE_CONSTRAINT_MESSAGES)) {
      if (message.includes(constraint)) return friendly;
    }
    return 'This name is already in use. Please choose a different name.';
  }

  if (message.includes('Invalid `') && message.includes('invocation')) {
    return fallback;
  }

  return message;
}

export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) {
    return messageFromHttpException(error);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return messageFromPrismaKnownError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return 'Invalid data submitted. Please check all required fields and try again.';
  }

  if (error instanceof Error) {
    return messageFromRawError(error.message, fallback);
  }

  return fallback;
}
