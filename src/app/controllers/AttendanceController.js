import * as Yup from 'yup';
import { Op } from 'sequelize';
import { isBefore } from 'date-fns';

import Attendance from '../models/Attendance';
import Meetup from '../models/Meetup';
import User from '../models/User';

import AttendeeMail from '../jobs/AttendeeMail';
import Queue from '../../lib/Queue';

class AttendanceController {
  async store(request, response) {
    const schema = Yup.object().shape({
      meetup_id: Yup.number().required(),
    });

    if (!(await schema.isValid(request.body))) {
      return response.status(400).json({ error: 'Meetup is not valid' });
    }

    const { meetup_id } = request.body;
    const user_id = request.userId;

    /**
     * Check if meetup really exists
     */

    const meetup = await Meetup.findByPk(meetup_id);

    if (!meetup) {
      return response.status(400).json({ error: 'Meetup does not exist' });
    }

    /**
     * Check if user is also the organizer
     */

    if (meetup.user_id === user_id) {
      return response.status(400).json({
        error: 'Organizers are not allowed to attend in their own Meetups',
      });
    }

    /**
     * Check if this meetup has already occurred
     */

    const checkDate = isBefore(meetup.date, new Date());

    if (checkDate) {
      return response
        .status(400)
        .json({ error: 'You cannot attend to a past meetup' });
    }

    /**
     * Check if the user is already attending this meetup
     */

    const isAttending = await Attendance.findOne({
      where: {
        meetup_id,
        user_id,
      },
    });

    if (isAttending) {
      return response
        .status(400)
        .json({ error: 'You are already an Attendee of this meetup' });
    }

    /**
     * Check if the user is not trying to attend two meetups at the same date/time
     */

    const sameDate = await Attendance.findOne({
      where: {
        user_id,
      },
      include: [
        {
          model: Meetup,
          required: true,
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (sameDate) {
      return response.status(400).json({
        error: 'You are not allowed to attend two meetups at the same time',
      });
    }

    await Attendance.create({
      meetup_id,
      user_id,
    });

    const attendance = await Attendance.findOne({
      where: {
        meetup_id,
        user_id,
      },
      include: [
        {
          model: Meetup,
          required: true,
          attributes: ['title', 'description', 'location', 'date'],
          include: [
            {
              model: User,
              required: true,
              attributes: ['name', 'email'],
            },
          ],
        },
        {
          model: User,
          required: true,
          attributes: ['name', 'email'],
        },
      ],
    });

    /**
     * Send an email to meetup organizer with info about the new Attendee
     */

    const attendeesTotal = await Attendance.count({
      where: {
        meetup_id,
      },
    });

    const { title: meetupTitle, date: meetupDate } = attendance.Meetup;
    const {
      name: organizerName,
      email: organizerEmail,
    } = attendance.Meetup.User;
    const { name: attendeeName, email: attendeeEmail } = attendance.User;

    await Queue.add(AttendeeMail.key, {
      attendeeName,
      attendeeEmail,
      organizerName,
      organizerEmail,
      meetupTitle,
      meetupDate,
      attendeesTotal,
    });

    return response.json(attendance);
  }

  async index(request, response) {
    const attendances = await Attendance.findAll({
      where: {
        user_id: request.userId,
      },
      include: [
        {
          model: Meetup,
          required: true,
          where: {
            date: {
              [Op.gt]: new Date(),
            },
          },
          order: [['date', 'ASC']],
        },
      ],
      attributes: ['user_id'],
    });

    return response.json(attendances);
  }
}

export default new AttendanceController();
