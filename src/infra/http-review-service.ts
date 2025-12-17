// src/infra/http-review-service.ts

import type {
  Review,
  ReviewService,
  AddReviewInput,
  AddReviewOutput,
  ListReviewsOutput,
} from '../app/review-service';

// --- DTO from your Reservations API ---
// It returns: { success: true, data: [ { ...ReservationDto } ] }

type ReservationDto = {
  id: string;
  deviceId: string;
  userId: string;
  startDate: string; // ISO
  endDate?: string; // ISO
  status: string;
  notes?: string;
};

type ListReservationsEnvelope = {
  success?: boolean;
  data?: ReservationDto[];
  errors?: string[];
  error?: string;
};

// Old review API shapes (for addReview)
type ReviewDto = {
  id: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
};

type ListReviewsResponseDto =
  | { reviews?: ReviewDto[]; totalCount?: number; errors?: string[] }
  | ReviewDto[];

type AddReviewResponseDto = { review?: ReviewDto; errors?: string[] };

// --------------------------------------------------
// HTTP client + options
// --------------------------------------------------

export type HttpClient = typeof fetch;

export type HttpReviewServiceOptions = {
  readonly baseUrl?: string;
  readonly http?: HttpClient;
  readonly headers?: Record<string, string>;
};

export class HttpReviewService implements ReviewService {
  private readonly baseUrl?: string;
  private readonly http: HttpClient;
  private readonly headers: Record<string, string>;

  constructor(options: HttpReviewServiceOptions = {}) {
    this.baseUrl = options.baseUrl
      ? options.baseUrl.replace(/\/$/, '')
      : undefined;

    // Bind fetch correctly so we don't get "illegal invocation"
    const rawHttp: HttpClient | undefined =
      options.http ?? (typeof fetch !== 'undefined' ? fetch : undefined);

    if (!rawHttp) {
      throw new Error('No fetch implementation available');
    }

    const target: any = typeof window !== 'undefined' ? window : globalThis;
    this.http = (rawHttp as any).bind(target);
    this.headers = { ...(options.headers ?? {}) };
  }

  // --------------------------------------------------
  // LIST: now talks to /reservations and understands { success, data }
  // --------------------------------------------------
  async listReviews(): Promise<ListReviewsOutput> {
    const res = await this.http(this.url('/reservations'), {
      method: 'GET',
      headers: this.mergeHeaders({ Accept: 'application/json' }),
    });

    await this.ensureOk(res);

    const body = (await this.parseJson(res)) as
      | ListReservationsEnvelope
      | ReservationDto[];

    let reservations: ReservationDto[] = [];
    let errors: string[] | undefined;

    if (Array.isArray(body)) {
      // Unwrapped array
      reservations = body;
    } else {
      if (Array.isArray(body.errors)) errors = body.errors;
      if (Array.isArray(body.data)) reservations = body.data;
      if (!reservations.length && body.error && !errors) {
        errors = [body.error];
      }
    }

    if (errors && errors.length) {
      throw new Error(errors.join('; '));
    }

    const reviews = reservations.map(toDomainReviewFromReservation);
    const totalCount = reviews.length;

    return { reviews, totalCount };
  }

  // --------------------------------------------------
  // ADD: still wired to the original /reviews API shape
  // (this is fine for now; your “Add Reservation” form is temporary anyway)
  // --------------------------------------------------
  async addReview(input: AddReviewInput): Promise<AddReviewOutput> {
    const dto = toAddReviewRequestDto(input);
    const res = await this.http(this.url('/reviews'), {
      method: 'POST',
      headers: this.mergeHeaders({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(dto),
    });
    await this.ensureOk(res);
    const body = (await this.parseJson(res)) as AddReviewResponseDto;
    if (Array.isArray(body.errors) && body.errors.length) {
      throw new Error(body.errors.join('; '));
    }
    const reviewDto = body.review;
    if (!reviewDto || typeof reviewDto !== 'object') {
      throw new Error('Malformed add review response');
    }
    const review = toDomainReview(reviewDto);
    return { review };
  }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  private url(path: string): string {
    if (!this.baseUrl) return path;
    return `${this.baseUrl}${path}`;
  }

  private mergeHeaders(extra: Record<string, string>): Record<string, string> {
    return { ...this.headers, ...extra };
  }

  private async ensureOk(res: Response): Promise<void> {
    if (res.ok) return;
    let message = `${res.status} ${res.statusText}`;
    try {
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const errBody = await res.clone().json();
        const msg = (errBody && (errBody.message || errBody.error)) as
          | string
          | undefined;
        if (msg) message = `${message} - ${msg}`;
      } else {
        const text = await res.clone().text();
        if (text) message = `${message} - ${text.slice(0, 300)}`;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  private async parseJson(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON response');
    }
  }
}

// --------------------------------------------------
// Mapping from ReservationDto -> Review domain type
// (so the existing UI can display it)
// --------------------------------------------------

function toDomainReviewFromReservation(r: ReservationDto): Review {
  const start = toDate(r.startDate);
  const end = r.endDate ? toDate(r.endDate) : null;

  const title = `Reservation for ${r.deviceId}`;
  const commentParts: string[] = [
    `User: ${r.userId}`,
    `Status: ${r.status}`,
    `Start: ${start.toLocaleString()}`,
  ];
  if (end) commentParts.push(`End: ${end.toLocaleString()}`);
  if (r.notes) commentParts.push(`Notes: ${r.notes}`);

  return {
    id: r.id,
    rating: 0, // we don't have a rating in Reservation; just use 0
    title,
    comment: commentParts.join(' | '),
    createdAt: start,
  };
}

// --------------------------------------------------
// Old review DTO mapping (for addReview only)
// --------------------------------------------------

type AddReviewRequestDto = {
  rating: number;
  title: string;
  comment: string;
};

function toAddReviewRequestDto(input: AddReviewInput): AddReviewRequestDto {
  return {
    rating: input.rating,
    title: input.title,
    comment: input.comment,
  };
}

function toDomainReview(r: ReviewDto): Review {
  return {
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    createdAt: toDate(r.createdAt),
  };
}

function toDate(v: string): Date {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  return d;
}
