<!-- src/components/AddReviewForm.vue -->
<script setup lang="ts">
import { reactive, ref, computed } from 'vue';

export type CreateReservationPayload = {
  deviceId: string;
  userId: string;
  startDate?: string;
  notes?: string;
};

const emit = defineEmits<{
  submit: [payload: CreateReservationPayload];
  cancel: [];
}>();

const props = defineProps<{
  isSubmitting?: boolean;
  error?: string | null;
}>();

const form = reactive({
  deviceId: '',
  userId: '',
  startDate: '',
  notes: '',
});

const validationErrors = ref<Record<string, string>>({});
const touched = reactive({
  deviceId: false,
  userId: false,
  startDate: false,
  notes: false,
});

const validate = (): boolean => {
  const errors: Record<string, string> = {};

  if (!form.deviceId.trim()) {
    errors.deviceId = 'Device ID is required';
  }

  if (!form.userId.trim()) {
    errors.userId = 'User ID is required';
  }

  if (form.startDate) {
    const d = new Date(form.startDate);
    if (Number.isNaN(d.getTime())) {
      errors.startDate = 'Start date must be a valid date/time';
    }
  }

  if (form.notes && form.notes.trim().length > 500) {
    errors.notes = 'Notes must be 500 characters or fewer';
  }

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const isValid = computed(() => {
  if (!form.deviceId.trim() || !form.userId.trim()) return false;
  if (form.startDate) {
    const d = new Date(form.startDate);
    if (Number.isNaN(d.getTime())) return false;
  }
  if (validationErrors.value.notes) return false;
  return true;
});

const handleSubmit = () => {
  touched.deviceId = true;
  touched.userId = true;
  touched.startDate = true;
  touched.notes = true;

  if (!validate()) return;

  emit('submit', {
    deviceId: form.deviceId.trim(),
    userId: form.userId.trim(),
    startDate: form.startDate || undefined,
    notes: form.notes.trim() || undefined,
  });
};

const handleCancel = () => {
  emit('cancel');
};

const resetForm = () => {
  form.deviceId = '';
  form.userId = '';
  form.startDate = '';
  form.notes = '';
  validationErrors.value = {};
  touched.deviceId = false;
  touched.userId = false;
  touched.startDate = false;
  touched.notes = false;
};

const markTouched = (field: keyof typeof touched) => {
  touched[field] = true;
  validate();
};

defineExpose({ resetForm });
</script>

<template>
  <div class="add-reservation-form">
    <h2>Create a Reservation</h2>

    <form @submit.prevent="handleSubmit">
      <!-- Device ID -->
      <div class="form-group">
        <label for="deviceId">Device ID</label>
        <input
          id="deviceId"
          type="text"
          v-model="form.deviceId"
          @blur="markTouched('deviceId')"
          placeholder="e.g. loan-device-001"
          :disabled="isSubmitting"
        />
        <span
          v-if="touched.deviceId && validationErrors.deviceId"
          class="error"
        >
          {{ validationErrors.deviceId }}
        </span>
      </div>

      <!-- User ID -->
      <div class="form-group">
        <label for="userId">User ID</label>
        <input
          id="userId"
          type="text"
          v-model="form.userId"
          @blur="markTouched('userId')"
          placeholder="e.g. student-001"
          :disabled="isSubmitting"
        />
        <span v-if="touched.userId && validationErrors.userId" class="error">
          {{ validationErrors.userId }}
        </span>
      </div>

      <!-- Start Date/Time -->
      <div class="form-group">
        <label for="startDate">Start date (optional)</label>
        <input
          id="startDate"
          type="datetime-local"
          v-model="form.startDate"
          @blur="markTouched('startDate')"
          :disabled="isSubmitting"
        />
        <span
          v-if="touched.startDate && validationErrors.startDate"
          class="error"
        >
          {{ validationErrors.startDate }}
        </span>
      </div>

      <!-- Notes -->
      <div class="form-group">
        <label for="notes">Notes (optional)</label>
        <textarea
          id="notes"
          v-model="form.notes"
          @blur="markTouched('notes')"
          placeholder="Anything the loans desk should know…"
          rows="4"
          maxlength="500"
          :disabled="isSubmitting"
        ></textarea>
        <span class="char-count">{{ form.notes.length }} / 500</span>
        <span v-if="touched.notes && validationErrors.notes" class="error">
          {{ validationErrors.notes }}
        </span>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="form-error">
        {{ error }}
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button
          type="button"
          @click="handleCancel"
          class="btn btn-secondary"
          :disabled="isSubmitting"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!isValid || isSubmitting"
        >
          {{ isSubmitting ? 'Creating…' : 'Create Reservation' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.add-reservation-form {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.add-reservation-form h2 {
  margin: 0 0 1.5rem;
  font-size: 1.5rem;
  color: #111827;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

input[type='text'],
input[type='datetime-local'],
textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

input[type='text']:focus,
input[type='datetime-local']:focus,
textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

input[type='text']:disabled,
input[type='datetime-local']:disabled,
textarea:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
}

textarea {
  resize: vertical;
  min-height: 120px;
}

.char-count {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: right;
}

.error {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #ef4444;
}

.form-error {
  padding: 1rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

@media (max-width: 640px) {
  .add-reservation-form {
    padding: 1rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
