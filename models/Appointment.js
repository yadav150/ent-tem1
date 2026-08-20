/* ============================================================
   APPOINTMENT MODEL
   MongoDB schema for storing appointment requests
   ============================================================ */

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
    {
        // Personal Information
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
            minlength: [2, 'Full name must be at least 2 characters'],
            maxlength: [100, 'Full name cannot exceed 100 characters']
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
            match: [/^[\+\d\s\-\(\)]{10,20}$/, 'Please provide a valid phone number']
        },
        email: {
            type: String,
            required: [true, 'Email address is required'],
            trim: true,
            lowercase: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Please provide a valid email address'
            ]
        },

        // Service Address
        address: {
            type: String,
            required: [true, 'Service address is required'],
            trim: true,
            minlength: [5, 'Address must be at least 5 characters'],
            maxlength: [200, 'Address cannot exceed 200 characters']
        },

        // Service Selection
        serviceType: {
            type: String,
            required: [true, 'Service type is required'],
            enum: {
                values: [
                    'service-1',
                    'service-2',
                    'service-3',
                    'service-4',
                    'service-5'
                ],
                message: 'Invalid service type selected'
            }
        },
        serviceName: {
            type: String,
            required: [true, 'Service name is required'],
            trim: true
        },

        // Appointment Date & Time
        appointmentDate: {
            type: Date,
            required: [true, 'Appointment date is required'],
            validate: {
                validator: function(value) {
                    // Ensure date is at least 24 hours from now
                    const now = new Date();
                    const minDate = new Date(now);
                    minDate.setDate(now.getDate() + 1);
                    return value >= minDate;
                },
                message: 'Appointment date must be at least 24 hours in advance'
            }
        },
        appointmentTime: {
            type: String,
            required: [true, 'Appointment time is required'],
            match: [
                /^(09:00|10:00|11:00|12:00|13:00|14:00|15:00|16:00|17:00)$/,
                'Invalid time slot selected'
            ]
        },
        timeSlotLabel: {
            type: String,
            required: [true, 'Time slot label is required'],
            trim: true
        },

        // Additional Notes
        notes: {
            type: String,
            trim: true,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
            default: ''
        },

        // Status tracking
        status: {
            type: String,
            enum: {
                values: ['pending', 'confirmed', 'completed', 'cancelled'],
                message: 'Invalid status value'
            },
            default: 'pending'
        },

        // WhatsApp notification tracking
        whatsappSent: {
            type: Boolean,
            default: false
        },
        whatsappSentAt: {
            type: Date
        },
        whatsappError: {
            type: String,
            default: null
        },

        // IP address for security
        ipAddress: {
            type: String,
            default: null
        },

        // User agent for security
        userAgent: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform: function(doc, ret) {
                ret.id = ret._id;
                delete ret.__v;
                return ret;
            }
        },
        toObject: {
            transform: function(doc, ret) {
                ret.id = ret._id;
                delete ret.__v;
                return ret;
            }
        }
    }
);

// Indexes for performance
appointmentSchema.index({ appointmentDate: 1, status: 1 });
appointmentSchema.index({ email: 1, createdAt: -1 });
appointmentSchema.index({ phone: 1, createdAt: -1 });
appointmentSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware: set service name based on service type
appointmentSchema.pre('save', function(next) {
    const serviceMap = {
        'service-1': '[Your Service Name]',
        'service-2': '[Your Service Name]',
        'service-3': '[Your Service Name]',
        'service-4': '[Your Service Name]',
        'service-5': '[Your Service Name]'
    };

    if (!this.serviceName && this.serviceType) {
        this.serviceName = serviceMap[this.serviceType] || this.serviceType;
    }

    // Set time slot label
    const timeMap = {
        '09:00': '09:00 - 10:00',
        '10:00': '10:00 - 11:00',
        '11:00': '11:00 - 12:00',
        '12:00': '12:00 - 13:00',
        '13:00': '13:00 - 14:00',
        '14:00': '14:00 - 15:00',
        '15:00': '15:00 - 16:00',
        '16:00': '16:00 - 17:00',
        '17:00': '17:00 - 18:00'
    };

    if (!this.timeSlotLabel && this.appointmentTime) {
        this.timeSlotLabel = timeMap[this.appointmentTime] || this.appointmentTime;
    }

    next();
});

// Static method: get appointments by date range
appointmentSchema.statics.getByDateRange = function(startDate, endDate) {
    return this.find({
        appointmentDate: {
            $gte: startDate,
            $lte: endDate
        }
    }).sort({ appointmentDate: 1, appointmentTime: 1 });
};

// Static method: get pending appointments
appointmentSchema.statics.getPending = function() {
    return this.find({ status: 'pending' })
        .sort({ createdAt: 1 })
        .limit(100);
};

// Static method: get today's appointments
appointmentSchema.statics.getTodayAppointments = function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return this.find({
        appointmentDate: {
            $gte: today,
            $lt: tomorrow
        },
        status: { $ne: 'cancelled' }
    }).sort({ appointmentTime: 1 });
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
