import { format, parseISO } from 'date-fns';
import en from 'date-fns/locale/en-US';

import Mail from '../../lib/Mail';

class AttendeeMail {
  get key() {
    return 'AttendeeMail';
  }

  async handle({ data }) {
    const {
      organizerName,
      organizerEmail,
      meetupTitle,
      meetupDate,
      attendeeName,
      attendeeEmail,
      attendeesTotal,
    } = data;

    console.log('Queue is running');

    await Mail.sendMail({
      to: `${organizerName} <${organizerEmail}>`,
      subject: `New Attendee to your Meetup: [${meetupTitle}]`,
      template: 'attendance',
      context: {
        organizerName,
        meetupTitle,
        meetupDate: format(parseISO(meetupDate), 'PP', { locale: en }),
        attendeeName,
        attendeeEmail,
        attendeesTotal,
      },
    });
  }
}

export default new AttendeeMail();
