import { DataSource } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { InvoiceItemEntity } from '../../entities/invoice-item.entity';
import { InvoiceEntity, InvoiceStatus } from '../../entities/invoice.entity';
import { PaymentEntity, PaymentMethod } from '../../entities/payment.entity';
import { RefundEntity } from '../../entities/refund.entity';
import { UserEntity } from '../../entities/user.entity';
import { ensureClinic } from './seed-clinic';

const REFUND_RATE = 0.05;

const randomInt = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1));

const pickOne = <T>(items: T[]): T => items[randomInt(0, items.length - 1)];

const pickPaymentMethod = (): PaymentMethod => {
  const roll = Math.random();
  if (roll < 0.4) return PaymentMethod.CASH;
  if (roll < 0.85) return PaymentMethod.CARD;
  if (roll < 0.95) return PaymentMethod.TRANSFER;
  return PaymentMethod.MEMBERSHIP;
};

/**
 * Creates one paid invoice + payment per completed appointment that doesn't
 * already have one, backdated to the appointment time so revenue analytics
 * has a real day-by-day spread. A small share of payments get a refund.
 * Idempotent per appointment (checked via appointmentId).
 */
export const seedInvoices = async (dataSource: DataSource): Promise<void> => {
  const clinic = await ensureClinic(dataSource);
  const appointmentRepository = dataSource.getRepository(AppointmentEntity);
  const invoiceRepository = dataSource.getRepository(InvoiceEntity);
  const invoiceItemRepository = dataSource.getRepository(InvoiceItemEntity);
  const paymentRepository = dataSource.getRepository(PaymentEntity);
  const refundRepository = dataSource.getRepository(RefundEntity);
  const userRepository = dataSource.getRepository(UserEntity);

  const completedAppointments = await appointmentRepository.find({
    where: { clinicId: clinic.id, status: AppointmentStatus.COMPLETED },
    relations: { service: true },
  });

  if (completedAppointments.length === 0) {
    // eslint-disable-next-line no-console -- seed CLI output
    console.log('No completed appointments found, skipping seed-invoices');
    return;
  }

  const cashiers = await userRepository.find({
    where: [
      { clinicId: clinic.id, role: UserRole.RECEPTIONIST },
      { clinicId: clinic.id, role: UserRole.ADMIN },
      { clinicId: clinic.id, role: UserRole.OWNER },
      { clinicId: clinic.id, role: UserRole.ACCOUNTANT },
    ],
  });

  let invoiceSequence = await invoiceRepository.count({
    where: { clinicId: clinic.id },
  });
  let createdCount = 0;

  for (const appointment of completedAppointments) {
    const existing = await invoiceRepository.findOne({
      where: { appointmentId: appointment.id },
    });

    if (existing) continue;

    invoiceSequence += 1;
    const number = `INV-${String(invoiceSequence).padStart(6, '0')}`;

    const invoice = await invoiceRepository.save(
      invoiceRepository.create({
        clinicId: clinic.id,
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        number,
        status: InvoiceStatus.PAID,
        subtotal: appointment.price,
        discountAmount: '0.00',
        total: appointment.price,
        discountId: null,
        promoCodeId: null,
      }),
    );
    invoice.createdAt = appointment.endsAt;
    await invoiceRepository.save(invoice);

    await invoiceItemRepository.save(
      invoiceItemRepository.create({
        invoiceId: invoice.id,
        serviceId: appointment.serviceId,
        title: appointment.service.name,
        quantity: 1,
        price: appointment.price,
        amount: appointment.price,
      }),
    );

    const receivedBy = cashiers.length > 0 ? pickOne(cashiers) : null;
    const payment = paymentRepository.create({
      invoiceId: invoice.id,
      method: pickPaymentMethod(),
      amount: appointment.price,
      giftCertificateId: null,
      receiptNumber: `${invoiceSequence}`,
      receivedById: receivedBy?.id ?? null,
    });
    payment.createdAt = appointment.endsAt;
    const savedPayment = await paymentRepository.save(payment);

    if (Math.random() < REFUND_RATE) {
      const refund = refundRepository.create({
        paymentId: savedPayment.id,
        amount: appointment.price,
        reason: 'Возврат по заявлению пациента',
        processedById: receivedBy?.id ?? null,
      });
      refund.createdAt = new Date(
        appointment.endsAt.getTime() + 24 * 60 * 60 * 1000,
      );
      await refundRepository.save(refund);

      invoice.status = InvoiceStatus.REFUNDED;
      await invoiceRepository.save(invoice);
    }

    createdCount += 1;
  }

  // eslint-disable-next-line no-console -- seed CLI output
  console.log(`Created ${createdCount} invoices with payments`);
};
