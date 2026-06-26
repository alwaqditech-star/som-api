export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum VehicleStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IN_AUCTION = 'in_auction',
  SOLD = 'sold',
}

export enum VehicleCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  DAMAGED = 'damaged',
  SALVAGE = 'salvage',
}

export enum Transmission {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
}

export enum FuelType {
  GASOLINE = 'gasoline',
  DIESEL = 'diesel',
  HYBRID = 'hybrid',
  ELECTRIC = 'electric',
}

export enum AuctionStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  PAUSED = 'paused',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
  SOLD = 'sold',
}

export enum AuctionType {
  LIVE = 'live',
  TIMED = 'timed',
}

export enum BidStatus {
  ACTIVE = 'active',
  OUTBID = 'outbid',
  WINNING = 'winning',
  WON = 'won',
  CANCELLED = 'cancelled',
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  BID_LOCK = 'bid_lock',
  BID_RELEASE = 'bid_release',
  PAYMENT = 'payment',
  REFUND = 'refund',
  COMMISSION = 'commission',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum NotificationType {
  BID_OUTBID = 'bid_outbid',
  AUCTION_STARTING = 'auction_starting',
  AUCTION_WON = 'auction_won',
  AUCTION_LOST = 'auction_lost',
  DEPOSIT_RECEIVED = 'deposit_received',
  VEHICLE_APPROVED = 'vehicle_approved',
  SYSTEM = 'system',
}
