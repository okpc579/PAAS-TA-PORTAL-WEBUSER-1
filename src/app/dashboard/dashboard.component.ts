import {Component, Input, OnInit} from '@angular/core';
import {CommonService} from '../common/common.service';
import {NGXLogger} from 'ngx-logger';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs/Observable';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {DashboardService} from './dashboard.service';
import {ServicePack} from './dashboard.service';
import {OrgService} from "../org/common/org.service";
import {Organization} from "../model/organization";
import {SpaceService} from "../space/space.service";
import {Space} from '../model/space';
import {count} from "rxjs/operator/count";
import {AppMainService} from '../dash/app-main/app-main.service';
import {CatalogService} from '../catalog/main/catalog.service';

declare var $: any;
declare var jQuery: any;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})

export class DashboardComponent implements OnInit {

  public isEmpty: boolean;
  public isSpace: boolean = false;
  public isMessage: boolean;
  private isLoadingSpaces = false;

  public token: string;
  public userid: string;
  public spaceGuid: string;
  public selectedSpaceId: string;

  public current_popmenu_id: string;
  public appName: string;
  public instanceName: string;
  public appNewName: string;
  public appDelName: string;
  public appSummaryGuid: string; // app guid value
  public selectedGuid: string;
  public selectedType: string;
  public selectedName: string;
  private appStatsCpuPer: number;
  private appStatsMemoryPer: number;
  private appStatsDiskPer: number;

  public orgs: Array<Organization>;
  public org: Organization;
  public spaces: Array<Space>;
  public space: Space;
  public servicepacks: Array<ServicePack>;

  public appSummaryEntities: Observable<any[]>;
  public appEntities: Observable<any[]>;
  public servicesEntities: Observable<any[]>;
  public appStatsEntities: Observable<any[]>;

  constructor(private commonService: CommonService,
              private dashboardService: DashboardService,
              private orgService: OrgService,
              private spaceService: SpaceService,
              private log: NGXLogger,
              private appMainService: AppMainService,
              private route: ActivatedRoute,
              private catalogService: CatalogService,
              private router: Router, private http: HttpClient) {
    if (commonService.getToken() == null) {
      router.navigate(['/']);
    }


    this.userid = this.commonService.getUserid();
    this.token = this.commonService.getToken();
    this.spaceGuid = this.commonService.getUserGuid();

    this.orgs = orgService.getOrgList();

    this.org = null;
    this.space = null;
    this.spaces = [];
    this.servicepacks = [];

    this.isEmpty = true;
    this.isSpace = false;
    this.isMessage = true;

    this.current_popmenu_id = '';
    this.appName = '';
    this.instanceName = '';
    this.appNewName = null;
    this.appDelName = '';
    this.selectedName = '';
  }

  ngOnInit() {
    console.log('ngOnInit fired');
    $(document).ready(() => {
      //TODO 임시로...
      $.getScript("../../assets/resources/js/common2.js")
        .done(function (script, textStatus) {
          //console.log( textStatus );
        })
        .fail(function (jqxhr, settings, exception) {
          console.log(exception);
        });
    });
  }


  getOrg(value: string) {
    if (value != '') {
      this.spaces = [];
      this.org = this.orgs.find(org => org.name === value);
      this.isLoadingSpaces = true;
      this.isEmpty = true;
      this.isSpace = false;
      this.appSummaryEntities = null;
      if (this.org != null && this.isLoadingSpaces && this.spaces.length <= 0) {
        this.isLoadingSpaces = false;
        this.spaces = this.spaceService.getOrgSpaceList(this.org.guid);
        this.log.debug(this.spaces);
      }
    }else{
      //초기화
      this.spaces = [];
      this.isEmpty = true;
      this.isSpace = false;
    }
  }

  getSpaces(value: string) {
    if (value != '') {
      this.log.debug(value);
      this.isEmpty = false;
      this.isSpace = true;
      this.isMessage = false;
      this.selectedSpaceId = value;
      this.space = this.spaces.find(Space => Space['_metadata']['guid'] === value);
      this.getAppSummary(value);
    }else{
      //초기화
      this.spaces = [];
      this.isEmpty = true;
      this.isSpace = false;
    }
  }

  getAppSummary(value: string) {
    this.showLoading();

    this.dashboardService.getAppSummary(value).subscribe(data => {

      // 애플리케이션 DISK,Memory %
      if (data) {
        this.appStatsEntities = data.instances;
        var cpu = 0;
        var mem = 0;
        var disk = 0;
        var cnt = 0;
        console.log(data);

        $.each(data.instances, function (key, dataobj) {
          if (dataobj.stats != null) {
            if (!(null == dataobj.stats.usage.cpu || '' == dataobj.stats.usage.cpu)) cpu = cpu + dataobj.stats.usage.cpu * 100;
            if (!(null == dataobj.stats.usage.mem || '' == dataobj.stats.usage.mem)) mem = mem + dataobj.stats.usage.mem / dataobj.stats.mem_quota * 100;
            if (!(null == dataobj.stats.usage.disk || '' == dataobj.stats.usage.disk)) disk = disk + dataobj.stats.usage.disk / dataobj.stats.disk_quota * 100;
            cnt++;
          }
        });
        this.appStatsCpuPer = Number((cpu / cnt).toFixed(2));
        this.appStatsMemoryPer = Math.round(mem / cnt);
        this.appStatsDiskPer = Math.round(disk / cnt);
      }

      this.commonService.isLoading = false;


      this.appEntities = data.apps;

      // this.servicesEntities = data.services; sort 재 정렬
      this.servicesEntities = data.services.sort((serA, serB) => {
        const guidA = serA.guid;
        const guidB = serB.guid;
        if (guidA === guidB)
          return 0;
        else if (guidA > guidB)
          return -1;
        else
          return 1;
      });
      return data;
    });
  }

  renameApp() {
    let params = {
      guid: this.selectedGuid,
      newName: this.selectedName,
    };
    this.dashboardService.renameApp(params).subscribe(data => {
      if (data == 1) {
        console.log('success');
      } else {
        console.log('failed.');
      }
      console.log(data);
      return data;
    });
    //.then(this.getAppSummary(this.selectedSpaceId))
    return this.getAppSummary(this.selectedSpaceId);
  }

  delApp(guidParam: string) {
    let params = {
      guid: guidParam
    };

    this.dashboardService.delApp(params).subscribe(data => {
      if (data == 1) {
        console.log('success');
      } else {
        console.log('failed.');
      }
      console.log(data);
      return data;
    });
    //.then(this.getAppSummary(this.selectedSpaceId))
    return this.getAppSummary(this.selectedSpaceId);
  }

  startApp() {
    let params = {
      guid: this.selectedGuid
    };

    this.dashboardService.startApp(params).subscribe(data => {
      return data;
    });
  }

  renameInstance() {
    let params = {
      guid: this.selectedGuid,
      newName: this.selectedName
    };
    this.dashboardService.renameInstance(params).subscribe(data => {
      console.log(params);
      return data;
    });
    //.then(this.getAppSummary(this.selectedSpaceId))
    return this.getAppSummary(this.selectedSpaceId);
  }

  delInstance(guidParam: string) {
    let params = {
      guid: guidParam
    };

    this.dashboardService.delInstance(params).subscribe(data => {
      return data;
    });
    //.then(this.getAppSummary(this.selectedSpaceId))
    return (this.getAppSummary(this.selectedSpaceId));
  }

  //move catalogDevelopment
  moveDevelopMent() {
    console.log(this.space);
    this.router.navigate(['catalogdevelopment', this.org.guid, this.org.name, this.space['name']]);
  }

  //move appMain
  moveDashboard(app_name: string, app_guid: string) {
    let org_name = this.org['name'];
    let org_guid = this.org['guid'];
    let space_name = this.space['name'];
    let space_guid = this.space['guid'];

    this.router.navigate(['appMain'], {
      queryParams: {
        org_name: org_name,
        org_guid: org_guid,
        space_name: space_name,
        space_guid: space_guid,
        app_name: app_name,
        app_guid: app_guid
      }
    });
  }

  //move moveDashboard_SourceController
  moveDashboardS() {
    // this.router.navigate();
  }

  showLoading() {
    this.commonService.isLoading = true;
  }

  dashTabClick(id: string) {
    $("[id^='dashTab_']").hide();
    $("#" + id).show();

    if (id == "dashTab_1") {
      $('.monitor_tabs li:nth-child(1)').removeClass('monitor_tabs_on monitor_tabs_right monitor_tabs_left').addClass('monitor_tabs_on');
      $('.monitor_tabs li:nth-child(2)').removeClass('monitor_tabs_on monitor_tabs_right monitor_tabs_left').addClass('monitor_tabs_right');
    } else if (id == "dashTab_2") {
      $('.monitor_tabs li:nth-child(1)').removeClass('monitor_tabs_on monitor_tabs_right monitor_tabs_left').addClass('monitor_tabs_right');
      $('.monitor_tabs li:nth-child(2)').removeClass('monitor_tabs_on monitor_tabs_right monitor_tabs_left').addClass('monitor_tabs_on');
      $("[id^='popclick_01']").hide();
    }
  }

  popclick(id: string, type: string, guid: string, name: string) {
    $('.space_pop_submenu').hide();
    if (this.current_popmenu_id != id) {
      $("#" + id).show();
      this.current_popmenu_id = id;
      this.selectedType = type;
      this.selectedGuid = guid;
      this.selectedName = name;
    } else {
      this.current_popmenu_id = '';
      this.selectedType = '';
      this.selectedGuid = '';
      this.selectedName = '';
    }
    this.log.debug('TYPE :: ' + type + ' GUID :: ' + guid);
  }


}//

