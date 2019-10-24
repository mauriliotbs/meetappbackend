import * as Yup from 'yup';
import { Op } from 'sequelize';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

import User from '../models/User';
import Meetup from '../models/Meetup';
import File from '../models/File';
import Attendance from '../models/Attendance';

class ScheduleController {
  async index(request, response) {
    const schema = Yup.object().shape({
      date: Yup.date().required(),
      page: Yup.number()
        .min(1)
        .required(),
    });

    if (!(await schema.isValid(request.query))) {
      return response
        .status(400)
        .json({ error: 'Date or page number invalid' });
    }

    const { page } = request.query;
    let { date } = request.query;

    date = parseISO(date);

    const meetupStartDay = startOfDay(date);
    const meetupEndDay = endOfDay(date);

    const schedules = await Meetup.findAndCountAll({
      where: {
        date: {
          [Op.between]: [meetupStartDay, meetupEndDay],
        },
      },
      include: [
        {
          model: User,
          required: true,
          attributes: ['name', 'email'],
        },
        {
          model: File,
          required: true,
          attributes: ['path', 'url'],
        },
        {
          model: Attendance,
          attributes: ['user_id'],
        },
      ],
      offset: (page - 1) * 10,
      limit: 10,
      order: [['date', 'ASC']],
    });

    response.set('Total-Meetups', schedules.count);

    return response.json(schedules.rows);
  }
}

export default new ScheduleController();
